import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class PulsePlusStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC
    const vpc = new ec2.Vpc(this, 'PulsePlusVpc', {
      maxAzs: 2
    });

    // Create ECS Cluster
    const cluster = new ecs.Cluster(this, 'PulsePlusCluster', { vpc });

    // Create ECR Repositories
    const frontendRepo = new ecr.Repository(this, 'FrontendRepo');
    const backendRepo = new ecr.Repository(this, 'BackendRepo');
    const dbRepo = new ecr.Repository(this, 'DBRepo');

    // Create RDS Instance
    const dbSecret = new secretsmanager.Secret(this, 'DBSecret', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'pulseplus-admin' }),
        generateStringKey: 'password',
        excludePunctuation: true,
      },
    });

    const database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_13 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      databaseName: 'pulseplus_db',
      credentials: rds.Credentials.fromSecret(dbSecret),
    });

    // Create Application Load Balancer
    const alb = new elbv2.ApplicationLoadBalancer(this, 'PulsePlusALB', {
      vpc,
      internetFacing: true
    });

    // Create Frontend Service
    const frontendTaskDef = new ecs.FargateTaskDefinition(this, 'FrontendTaskDef');
    frontendTaskDef.addContainer('FrontendContainer', {
      image: ecs.ContainerImage.fromEcrRepository(frontendRepo),
      portMappings: [{ containerPort: 3000 }],
      environment: {
        FRONTEND_PORT: '3000',
        NEXT_PUBLIC_FRONTEND_URL: `http://${alb.loadBalancerDnsName}`,
        NEXT_PUBLIC_BACKEND_URL: `http://${alb.loadBalancerDnsName}:3001`,
      },
    });

    const frontendService = new ecs.FargateService(this, 'FrontendService', {
      cluster,
      taskDefinition: frontendTaskDef,
      desiredCount: 1,
    });

    // Create Backend Service
    const backendTaskDef = new ecs.FargateTaskDefinition(this, 'BackendTaskDef');
    backendTaskDef.addContainer('BackendContainer', {
      image: ecs.ContainerImage.fromEcrRepository(backendRepo),
      portMappings: [{ containerPort: 3001 }],
      environment: {
        BACKEND_PORT: '3001',
        NODE_ENV: 'production',
        POSTGRES_URL: `postgres://${database.dbInstanceEndpointAddress}:${database.dbInstanceEndpointPort}/pulseplus_db`,
      },
      secrets: {
        JWT_SECRET: ecs.Secret.fromSecretsManager(dbSecret, 'jwt_secret'),
        SESSION_SECRET: ecs.Secret.fromSecretsManager(dbSecret, 'session_secret'),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, 'password'),
      },
    });

    const backendService = new ecs.FargateService(this, 'BackendService', {
      cluster,
      taskDefinition: backendTaskDef,
      desiredCount: 1,
    });

    // Add ALB Listeners
    const frontendListener = alb.addListener('FrontendListener', { port: 80 });
    frontendListener.addTargets('FrontendTarget', {
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [frontendService],
      healthCheck: { path: '/' },
    });

    const backendListener = alb.addListener('BackendListener', { 
      port: 3001,
      protocol: elbv2.ApplicationProtocol.HTTP
    });
    backendListener.addTargets('BackendTarget', {
      port: 3001,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [backendService],
      healthCheck: { path: '/health' },
    });

    // Allow backend to access the database
    database.connections.allowFrom(backendService, ec2.Port.tcp(5432));

    // Output the ALB DNS name
    new cdk.CfnOutput(this, 'LoadBalancerDNS', { value: alb.loadBalancerDnsName });
  }
}