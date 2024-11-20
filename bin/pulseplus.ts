#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib/core';
import { PulsePlusStack } from '../lib/pulseplus-stack';

const app = new cdk.App();
new PulsePlusStack(app, 'PulsePlusStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
});