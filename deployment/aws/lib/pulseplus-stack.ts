import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as autoscaling from 'aws-cdk-lib/aws-applicationautoscaling';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

export interface PulsePlusStackProps extends cdk.StackProps {
  domainName: string;
  environment: string;
}

export class PulsePlusStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PulsePlusStackProps) {
    super(scope, id, props);

    // Create VPC with proper networking
    const vpc = new ec2.Vpc(this, 'PulsePlusVpc', {
      maxAzs: 2,
      natGateways: 2,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // Create ECS Cluster with capacity providers
    const cluster = new ecs.Cluster(this, 'PulsePlusCluster', {
      vpc,
      containerInsights: true,
    });

    // Create ECR repositories for the images
    const frontendRepo = new ecr.Repository(this, 'FrontendRepo', {
      repositoryName: `${props.environment}-pulseplus-frontend`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const backendRepo = new ecr.Repository(this, 'BackendRepo', {
      repositoryName: `${props.environment}-pulseplus-backend`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const docsRepo = new ecr.Repository(this, 'DocsRepo', {
      repositoryName: `${props.environment}-pulseplus-docs`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const nginxRepo = new ecr.Repository(this, 'NginxRepo', {
      repositoryName: `${props.environment}-pulseplus-nginx`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Create security groups
    const albSg = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc,
      description: 'Security group for ALB',
    });

    const backendSg = new ec2.SecurityGroup(this, 'BackendSecurityGroup', {
      vpc,
      description: 'Security group for Backend service',
    });

    const dbSg = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc,
      description: 'Security group for RDS',
    });

    // Configure security group rules
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS');
    backendSg.addIngressRule(albSg, ec2.Port.tcp(3001), 'Allow ALB');
    dbSg.addIngressRule(backendSg, ec2.Port.tcp(5432), 'Allow Backend');

    // Create RDS Instance with proper configuration
    const dbSecret = new secretsmanager.Secret(this, 'DBSecret', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'pulseplus-admin',
          jwt_secret: cdk.SecretValue.unsafePlainText(cdk.Names.uniqueId(this)),
          session_secret: cdk.SecretValue.unsafePlainText(cdk.Names.uniqueId(this)),
        }),
        generateStringKey: 'password',
        excludePunctuation: true,
      },
    });

    const database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_13 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSg],
      databaseName: 'pulseplus_db',
      credentials: rds.Credentials.fromSecret(dbSecret),
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: false,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
      storageEncrypted: true,
    });

    // Set up DNS and SSL
    const zone = route53.HostedZone.fromLookup(this, 'Zone', {
      domainName: props.domainName,
    });

    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: props.domainName,
      validation: acm.CertificateValidation.fromDns(zone),
    });

    // Create Application Load Balancer with HTTPS
    const alb = new elbv2.ApplicationLoadBalancer(this, 'PulsePlusALB', {
      vpc,
      internetFacing: true,
      securityGroup: albSg,
    });

    // Create WAF ACL
    const wafAcl = new wafv2.CfnWebACL(this, 'WAFWebACL', {
      defaultAction: { allow: {} },
      scope: 'REGIONAL',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'WAFWebACL',
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: 'RateLimit',
          priority: 1,
          statement: {
            rateBasedStatement: {
              limit: 2000,
              aggregateKeyType: 'IP',
            },
          },
          action: { block: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimit',
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    // Create task definitions for the services
    const frontendTaskDef = new ecs.FargateTaskDefinition(this, 'FrontendTaskDef', {
      memoryLimitMiB: 1024,
      cpu: 512,
    });

    const backendTaskDef = new ecs.FargateTaskDefinition(this, 'BackendTaskDef', {
      memoryLimitMiB: 1024,
      cpu: 512,
    });

    const docsTaskDef = new ecs.FargateTaskDefinition(this, 'DocsTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    // Add container to the task definition
    const frontendContainer = frontendTaskDef.addContainer('FrontendContainer', {
      image: ecs.ContainerImage.fromEcrRepository(frontendRepo),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'frontend' }),
      environment: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_BACKEND_URL: `https://${props.domainName}/api`,
      },
    });

    const backendContainer = backendTaskDef.addContainer('BackendContainer', {
      image: ecs.ContainerImage.fromEcrRepository(backendRepo),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'backend' }),
      environment: {
        NODE_ENV: 'production',
        DB_HOST: database.dbInstanceEndpointAddress,
        DB_PORT: database.dbInstanceEndpointPort,
        DB_NAME: 'pulseplus',
        DB_SECRET_ID: dbSecret.secretArn,
      },
    });

    const docsContainer = docsTaskDef.addContainer('DocsContainer', {
      image: ecs.ContainerImage.fromEcrRepository(docsRepo),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'docs' }),
      environment: {
        NODE_ENV: 'production',
      },
    });

    // Add port mappings
    frontendContainer.addPortMappings({
      containerPort: 3000,
    });

    backendContainer.addPortMappings({
      containerPort: 3001,
    });

    docsContainer.addPortMappings({
      containerPort: 3000,
    });

    // Create Fargate services
    const frontendService = new ecs.FargateService(this, 'FrontendService', {
      cluster,
      taskDefinition: frontendTaskDef,
      desiredCount: 2,
      securityGroups: [backendSg],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      assignPublicIp: false,
    });

    const backendService = new ecs.FargateService(this, 'BackendService', {
      cluster,
      taskDefinition: backendTaskDef,
      desiredCount: 2,
      securityGroups: [backendSg],
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      assignPublicIp: false,
    });

    const docsService = new ecs.FargateService(this, 'DocsService', {
      cluster,
      taskDefinition: docsTaskDef,
      desiredCount: 1,
      securityGroups: [backendSg], // Using the same security group as backend
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      assignPublicIp: false,
    });

    // Create Nginx task definition and service
    const nginxTaskDef = new ecs.FargateTaskDefinition(this, 'NginxTaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    const nginxContainer = nginxTaskDef.addContainer('NginxContainer', {
      image: ecs.ContainerImage.fromEcrRepository(nginxRepo),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'nginx' }),
      environment: {
        NODE_ENV: 'production',
      },
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:80/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(10),
      },
    });

    nginxContainer.addPortMappings({
      containerPort: 80,
      hostPort: 80,
      protocol: ecs.Protocol.TCP,
    });

    const nginxService = new ecs.FargateService(this, 'NginxService', {
      cluster,
      taskDefinition: nginxTaskDef,
      desiredCount: 2,
      securityGroups: [backendSg], // Using the same security group as backend
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      assignPublicIp: false,
    });

    // Add target groups for the services
    const frontendTG = new elbv2.ApplicationTargetGroup(this, 'FrontendTG', {
      vpc,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
      },
    });

    const backendTG = new elbv2.ApplicationTargetGroup(this, 'BackendTG', {
      vpc,
      port: 3001,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/api/health',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
      },
    });

    const docsTG = new elbv2.ApplicationTargetGroup(this, 'DocsTG', {
      vpc,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/health',
        interval: cdk.Duration.seconds(60),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
      },
    });

    const nginxTG = new elbv2.ApplicationTargetGroup(this, 'NginxTG', {
      vpc,
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/health',
        interval: cdk.Duration.seconds(60),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 5,
      },
    });

    // Add targets to target groups
    frontendTG.addTarget(frontendService);
    backendTG.addTarget(backendService);
    docsTG.addTarget(docsService);
    nginxTG.addTarget(nginxService);

    // Add listeners to the load balancer
    const httpsListener = alb.addListener('HttpsListener', {
      port: 443,
      certificates: [certificate],
      defaultAction: elbv2.ListenerAction.forward([nginxTG]), // Use nginx as the default target
    });

    // Add rules to the HTTPS listener
    httpsListener.addAction('ApiAction', {
      priority: 10,
      conditions: [
        elbv2.ListenerCondition.pathPatterns(['/api/*']),
      ],
      action: elbv2.ListenerAction.forward([backendTG]),
    });

    httpsListener.addAction('DocsAction', {
      priority: 20,
      conditions: [
        elbv2.ListenerCondition.pathPatterns(['/docs/*']),
      ],
      action: elbv2.ListenerAction.forward([docsTG]),
    });

    // Redirect HTTP to HTTPS
    alb.addListener('HttpListener', {
      port: 80,
      defaultAction: elbv2.ListenerAction.redirect({
        protocol: 'HTTPS',
        port: '443',
        permanent: true,
      }),
    });

    // Create Route53 alias record
    new route53.ARecord(this, 'AliasRecord', {
      zone,
      target: route53.RecordTarget.fromAlias(new targets.LoadBalancerTarget(alb)),
      recordName: props.domainName,
    });

    // CloudWatch Alarms
    new cloudwatch.Alarm(this, 'HighCPUAlarm', {
      metric: backendService.metricCpuUtilization(),
      threshold: 90,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
    });

    new cloudwatch.Alarm(this, 'High5xxErrorRate', {
      metric: alb.metricHttpCodeTarget(elbv2.HttpCodeTarget.TARGET_5XX_COUNT),
      threshold: 10,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
    });

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', { value: alb.loadBalancerDnsName });
    new cdk.CfnOutput(this, 'DomainName', { value: props.domainName });
    new cdk.CfnOutput(this, 'FrontendRepositoryURI', { value: frontendRepo.repositoryUri });
    new cdk.CfnOutput(this, 'BackendRepositoryURI', { value: backendRepo.repositoryUri });
  }
}