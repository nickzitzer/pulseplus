#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PulsePlusStack } from '../lib/pulseplus-stack';

const app = new cdk.App();
new PulsePlusStack(app, 'PulsePlusStack');