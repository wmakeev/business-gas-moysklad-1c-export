import * as cdk from 'aws-cdk-lib'
import { AppStack } from './AppStack'

const app = new cdk.App()
new AppStack(app, 'Moysklad1cExport')
