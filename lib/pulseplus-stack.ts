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

    // Create ECR Repositories with lifecycle rules
    const frontendRepo = new ecr.Repository(this, 'FrontendRepo', {
      lifecycleRules: [
        {
          maxImageCount: 5,
          tagStatus: ecr.TagStatus.UNTAGGED,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const backendRepo = new ecr.Repository(this, 'BackendRepo', {
      lifecycleRules: [
        {
          maxImageCount: 5,
          tagStatus: ecr.TagStatus.UNTAGGED,
        },
      ],
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

    // Create Frontend Service with auto-scaling
    const frontendTaskDef = new ecs.FargateTaskDefinition(this, 'FrontendTaskDef', {
      memoryLimitMiB: 1024,
      cpu: 512,
    });

    frontendTaskDef.addContainer('FrontendContainer', {
      image: ecs.ContainerImage.fromEcrRepository(frontendRepo),
      portMappings: [{ containerPort: 3000 }],
      environment: {
        FRONTEND_PORT: '3000',
        NEXT_PUBLIC_FRONTEND_URL: `https://${props.domainName}`,
        NEXT_PUBLIC_BACKEND_URL: `https://${props.domainName}/api`,
        NODE_ENV: props.environment,
      },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'frontend' }),
    });

    const frontendService = new ecs.FargateService(this, 'FrontendService', {
      cluster,
      taskDefinition: frontendTaskDef,
      desiredCount: 2,
      securityGroups: [backendSg],
      assignPublicIp: false,
    });

    const frontendScaling = frontendService.autoScaleTaskCount({
      minCapacity: 2,
      maxCapacity: 10,
    });

    frontendScaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
    });

    // Create Backend Service with auto-scaling
    const backendTaskDef = new ecs.FargateTaskDefinition(this, 'BackendTaskDef', {
      memoryLimitMiB: 1024,
      cpu: 512,
    });

    backendTaskDef.addContainer('BackendContainer', {
      image: ecs.ContainerImage.fromEcrRepository(backendRepo),
      portMappings: [{ containerPort: 3001 }],
      environment: {
        BACKEND_PORT: '3001',
        NODE_ENV: props.environment,
        POSTGRES_HOST: database.dbInstanceEndpointAddress,
        POSTGRES_PORT: database.dbInstanceEndpointPort,
        POSTGRES_DB: 'pulseplus_db',
      },
      secrets: {
        JWT_SECRET: ecs.Secret.fromSecretsManager(dbSecret, 'jwt_secret'),
        SESSION_SECRET: ecs.Secret.fromSecretsManager(dbSecret, 'session_secret'),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, 'password'),
      },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'backend' }),
    });

    const backendService = new ecs.FargateService(this, 'BackendService', {
      cluster,
      taskDefinition: backendTaskDef,
      desiredCount: 2,
      securityGroups: [backendSg],
      assignPublicIp: false,
    });

    const backendScaling = backendService.autoScaleTaskCount({
      minCapacity: 2,
      maxCapacity: 10,
    });

    backendScaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
    });

    // Add ALB Listeners with HTTPS
    const httpsListener = alb.addListener('HttpsListener', {
      port: 443,
      certificates: [certificate],
      protocol: elbv2.ApplicationProtocol.HTTPS,
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

    // Frontend target group
    httpsListener.addTargets('FrontendTarget', {
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [frontendService],
      healthCheck: {
        path: '/',
        healthyHttpCodes: '200,304',
        interval: cdk.Duration.seconds(30),
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    // Backend target group with path-based routing
    httpsListener.addTargets('BackendTarget', {
      port: 3001,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [backendService],
      conditions: [elbv2.ListenerCondition.pathPatterns(['/api/*'])],
      priority: 10,
      healthCheck: {
        path: '/api/health',
        healthyHttpCodes: '200',
        interval: cdk.Duration.seconds(30),
      },
      deregistrationDelay: cdk.Duration.seconds(30),
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