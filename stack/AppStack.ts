import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigw from 'aws-cdk-lib/aws-apigateway'

export class AppStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const APP_NAME = 'Moysklad1cExport'

    const dependenciesLayer = new lambda.LayerVersion(this, `${APP_NAME}Deps`, {
      code: lambda.Code.fromAsset('./layer/dependencies/'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_14_X]
    })

    const getDataLambda = new lambda.Function(this, 'ExportDataHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('./build/src'),
      handler: 'lambda.exportDataHandler',
      memorySize: 128,
      timeout: cdk.Duration.seconds(27),
      environment: {
        NODE_OPTIONS: '--enable-source-maps'
      },
      layers: [dependenciesLayer]
    })

    new apigw.LambdaRestApi(this, 'ExportDataEndpoint', {
      handler: getDataLambda
    })
  }
}
