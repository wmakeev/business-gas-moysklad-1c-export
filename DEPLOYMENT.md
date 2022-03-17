# Stack CI pipeline deployment

## 1. Preconditions

### [Install np]()

```bash
npm install -g np@latest
```

### [Install AWS CDK](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html#getting_started_install)

```bash
npm install -g aws-cdk@latest
```

```bash
cdk --version
```

Output:

```
2.16.0 (build 4c77925)
```

## 2. Install dependencies and test project

```bash
npm install
```

```bash
npm run test
```

## 3. Update stack config (if necessary)

Update stack props in `stack/synth.ts` and commit

## 4. Create CodeCommit repository (if CI is necessary)

> For consistence use CammelCase naming convention

```bash
APP_NAME=MyAppCamelCaseName

APP_DESCRIPTION="App description"
```

```bash
aws codecommit create-repository --repository-name ${APP_NAME}Stack --repository-description $APP_DESCRIPTION --profile default
```

command output:

```json
{
  "repositoryMetadata": {
    ...
    "cloneUrlSsh": "ssh://git-codecommit.eu-west-1.amazonaws.com/v1/repos/NewOrderProductAppendStack",
    ...
  }
}
```

Ensure you have valid [ssh config](https://gist.github.com/wmakeev/4df153853c203d80a41f58f862635e60) for CodeCommit.

```bash
REPO_CLONE_URL=[cloneUrlSsh]
```

Replace host (`git-codecommit.eu-west-1.amazonaws.com`) in `cloneUrlSsh` to alias, if necessary.

Add origin

```bash
git remote add origin $REPO_CLONE_URL
```

Add `stage` branch

```bash
git branch stage
```

Commit all current changes.

Push to `master`

```bash
git push --set-upstream origin master
```

Push to `stage`

```bash
git push origin stage
```

## 5. Bootstrap AWS account (if necessary)

Once for each deploy region in current account,

```
npx cdk bootstrap --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess --profile default
```

or specific account

```
npx cdk bootstrap aws://ACCOUNT-NUMBER/REGION --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess --profile default
```

Get current `ACCOUNT-NUMBER`

```
aws sts get-caller-identity
aws sts get-caller-identity --profile default
```

Get current `REGION`

```
aws configure get region
aws configure get region --profile prod
```

## 6. Release new version (if necessary)

```bash
np
```

## 7. Setup environment

Ensure all configs and secrets described in README is existsy.

## 8. Deploy CDK stack

```bash
PROFILE=default npm run deploy
```
