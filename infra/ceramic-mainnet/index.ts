// ===== CERAMIC MAINNET STACK =====
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// Note - this stack is not deployed yet, pending answers to questions:
// 1) which AWS account does this live in?
// 2) we need to have a public, static egress IP address for the ceramic node -
//    how do we configure this?

// The following vars are not allowed to be undefined, hence the `${...}` magic

let route53Zone = `${process.env["ROUTE_53_ZONE"]}`;
let domain = `ceramic.${process.env["DOMAIN"]}`;
let rpcUrl = `${process.env["RPC_URL"]}`;
const serviceAccount = aws.elb.getServiceAccount({});

//////////////////////////////////////////////////////////////
// Create permissions:
//  - user for bucket access
//////////////////////////////////////////////////////////////

const usrS3 = new aws.iam.User(`gitcoin-ceramic-usr-s3`, {
  path: "/dpopp/",
});

const usrS3AccessKey = new aws.iam.AccessKey(`gitcoin-ceramic-usr-key`, { user: usrS3.name });

export const usrS3Key = usrS3AccessKey.id;
export const usrS3Secret = usrS3AccessKey.secret;

//////////////////////////////////////////////////////////////
// Create HTTPS certificate
//////////////////////////////////////////////////////////////

// Generate an SSL certificate
const certificate = new aws.acm.Certificate("gitcoin-ceramic-cert", {
  domainName: domain,
  tags: {
    Environment: "production",
  },
  validationMethod: "DNS",
});

const certificateValidationDomain = new aws.route53.Record(`${domain}-validation`, {
  name: certificate.domainValidationOptions[0].resourceRecordName,
  zoneId: route53Zone,
  type: certificate.domainValidationOptions[0].resourceRecordType,
  records: [certificate.domainValidationOptions[0].resourceRecordValue],
  ttl: 600,
});

const certificateValidation = new aws.acm.CertificateValidation(
  "gitcoin-ceramic-cert-validation",
  {
    certificateArn: certificate.arn,
    validationRecordFqdns: [certificateValidationDomain.fqdn],
  },
  { customTimeouts: { create: "30s", update: "30s" } }
);

//////////////////////////////////////////////////////////////
// Create bucket for ipfs deamon
// https://developers.ceramic.network/run/nodes/nodes/#example-aws-s3-policies
//////////////////////////////////////////////////////////////

const ipfsBucket = new aws.s3.Bucket(`gitcoin-ceramic-ipfs`, {
  acl: "private",
  forceDestroy: true,
});

const ipfsBucketPolicyDocument = aws.iam.getPolicyDocumentOutput({
  statements: [
    {
      principals: [
        {
          type: "AWS",
          identifiers: [pulumi.interpolate`${usrS3.arn}`],
        },
      ],
      actions: ["s3:GetObject", "s3:ListBucket", "s3:PutObject", "s3:DeleteObject"],
      resources: [ipfsBucket.arn, pulumi.interpolate`${ipfsBucket.arn}/*`],
    },
  ],
});

const ipfsBucketPolicy = new aws.s3.BucketPolicy(`gitcoin-ceramic-ipfs-policy`, {
  bucket: ipfsBucket.id,
  policy: ipfsBucketPolicyDocument.apply((ipfsBucketPolicyDocument) => ipfsBucketPolicyDocument.json),
});

export const ipfsBucketName = ipfsBucket.id;
export const ipfsBucketArn = ipfsBucket.arn;
// export const ipfsBucketWebURL = pulumi.interpolate`http://${ipfsBucket.websiteEndpoint}/`;

//////////////////////////////////////////////////////////////
// Create bucket for ceramic state
// https://developers.ceramic.network/run/nodes/nodes/#example-aws-s3-policies
//////////////////////////////////////////////////////////////

const ceramicStateBucket = new aws.s3.Bucket(`gitcoin-ceramicState`, {
  acl: "private",
  forceDestroy: true,
});

const ceramicStateBucketPolicyDocument = aws.iam.getPolicyDocumentOutput({
  statements: [
    {
      principals: [
        {
          type: "AWS",
          identifiers: [pulumi.interpolate`${usrS3.arn}`],
        },
      ],
      actions: ["s3:ListBucket", "s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      resources: [ceramicStateBucket.arn, pulumi.interpolate`${ceramicStateBucket.arn}/*`],
    },
  ],
});

const ceramicStateBucketPolicy = new aws.s3.BucketPolicy(`gitcoin-ceramicState-policy}`, {
  bucket: ceramicStateBucket.id,
  policy: ceramicStateBucketPolicyDocument.apply(
    (ceramicStateBucketPolicyDocument) => ceramicStateBucketPolicyDocument.json
  ),
});

export const ceramicStateBucketName = ceramicStateBucket.id;
export const ceramicStateBucketArn = ceramicStateBucket.arn;

//////////////////////////////////////////////////////////////
// Create bucket for logs
//////////////////////////////////////////////////////////////
const accessLogsBucket = new aws.s3.Bucket(`gitcoin-ceramic-logs`, {
  acl: "private",
  forceDestroy: true,
});

// Set up bucket policy for access logs bucket of the ALB
// - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html
// - https://www.pulumi.com/registry/packages/aws/api-docs/elb/getserviceaccount/
const accessLogsBucketPolicyDocument = aws.iam.getPolicyDocumentOutput({
  statements: serviceAccount.then((serviceAccount) => [
    {
      effect: "Allow",
      principals: [
        {
          type: "AWS",
          identifiers: [pulumi.interpolate`${serviceAccount.arn}`],
        },
      ],
      actions: ["s3:PutObject"],
      resources: [pulumi.interpolate`arn:aws:s3:::${accessLogsBucket.id}/AWSLogs/*`],
    },
    {
      effect: "Allow",
      principals: [
        {
          type: "Service",
          identifiers: ["logdelivery.elb.amazonaws.com"],
        },
      ],
      actions: ["s3:GetBucketAcl"],
      resources: [pulumi.interpolate`arn:aws:s3:::${accessLogsBucket.id}`],
    },
  ]),
});

const accessLogsBucketPolicy = new aws.s3.BucketPolicy(`gitcoin-accessLogs-policy`, {
  bucket: accessLogsBucket.id,
  policy: accessLogsBucketPolicyDocument.apply((accessLogsBucketPolicyDocument) => accessLogsBucketPolicyDocument.json),
});

//////////////////////////////////////////////////////////////
// Set up VPC
//////////////////////////////////////////////////////////////

const vpc = new awsx.ec2.Vpc("gitcoin-ceramic", {
  subnets: [{ type: "public" }, { type: "private", mapPublicIpOnLaunch: true }],
});

export const vpcID = vpc.id;
export const vpcPrivateSubnetIds = vpc.privateSubnetIds;
export const vpcPublicSubnetIds = vpc.publicSubnetIds;

export const vpcPrivateSubnetId1 = vpcPrivateSubnetIds.then((values) => values[0]);
export const vpcPrivateSubnetId2 = vpcPrivateSubnetIds.then((values) => values[1]);
export const vpcPublicSubnetId1 = vpcPublicSubnetIds.then((values) => values[0]);

export const vpcPublicSubnet1 = vpcPublicSubnetIds.then((subnets) => {
  return subnets[0];
});

export const vpcPrivateSubnetId1Str = pulumi.interpolate`${vpcPrivateSubnetId1}`;
export const vpcPrivateSubnetId2Str = pulumi.interpolate`${vpcPrivateSubnetId2}`;

//////////////////////////////////////////////////////////////
// EFS for `/data/ipfs` folder in ipfs task
//////////////////////////////////////////////////////////////

// Allocate a security group and then a series of rules:
const sg = new awsx.ec2.SecurityGroup(`dpopp-ipfs-data-efs-sg`, { vpc });
const NFS_PORT = 2049;
// inbound nfs traffic on port 2049 from a specific IP address
sg.createIngressRule("nfs-access", {
  location: new awsx.ec2.AnyIPv4Location(),
  ports: new awsx.ec2.TcpPorts(NFS_PORT),
  description: "allow NFS access for EFS from anywhere",
});
// outbound TCP traffic on any port to anywhere
sg.createEgressRule("outbound-access", {
  location: new awsx.ec2.AnyIPv4Location(),
  ports: new awsx.ec2.AllTcpPorts(),
  description: "allow outbound access to anywhere",
});

const efs = new aws.efs.FileSystem(`dpopp-ipfs-data-efs`, {
  tags: {
    Name: `dpopp-ipfs-data`,
  },
});
// Create a mount target for both public subnets
const privateMountTarget_1 = new aws.efs.MountTarget(`dpopp-ipfs-data-privateMountTarget-1`, {
  fileSystemId: efs.id,
  subnetId: vpcPrivateSubnetId1Str,
  securityGroups: [sg.id],
});
const publicMountTarget_2 = new aws.efs.MountTarget(`dpopp-ipfs-data-privateMountTarget-2`, {
  fileSystemId: efs.id,
  subnetId: vpcPrivateSubnetId2Str,
  securityGroups: [sg.id]
});

//////////////////////////////////////////////////////////////
// Set up ALB and ECS cluster
//////////////////////////////////////////////////////////////

const cluster = new awsx.ecs.Cluster("gitcoin-ceramic", { vpc });
export const clusterId = cluster.id;

const alb = new awsx.lb.ApplicationLoadBalancer(`gitcoin-ceramic`, {
  vpc,
  accessLogs: {
    bucket: accessLogsBucket.bucket,
    enabled: true,
  },
  idleTimeout: 120
});

// Listen to HTTP traffic on port 80 and redirect to 443
const httpListener = alb.createListener("gitcoin-ceramic-http", {
  port: 80,
  protocol: "HTTP",
  defaultAction: {
    type: "redirect",
    redirect: {
      protocol: "HTTPS",
      port: "443",
      statusCode: "HTTP_301",
    },
  },
});
export const frontendUrlEcs = pulumi.interpolate`http://${httpListener.endpoint.hostname}/`;

const target = alb.createTargetGroup("gitcoin-dpopp-ceramic", {
  vpc,
  port: 80,
  healthCheck: { path: "/api/v0/node/healthcheck", unhealthyThreshold: 3, port: "80", interval: 60, timeout: 30, healthyThreshold: 2 },
});

// Listen to traffic on port 443 & route it through the Ceramic target group
const httpsListener = target.createListener("gitcoin-ceramic-https", {
  port: 443,
  certificateArn: certificateValidation.certificateArn,
});

// Target group for the IPFS container
const ceramicTarget = alb.createTargetGroup("gitcoin-dpopp-swarm", {
  vpc,
  port: 4001,
  protocol: "HTTP",
  healthCheck: { path: "/", unhealthyThreshold: 5, port: "8011", interval: 60, timeout: 30 },
});

const ceramicListener = ceramicTarget.createListener("gitcoin-dpopp-swarm", {
  protocol: "HTTP",
  port: 4001,
});

const ipfsTarget = alb.createTargetGroup("gitcoin-dpopp-ipfs", {
  vpc,
  port: 5001,
  protocol: "HTTP",
  healthCheck: { path: "/", unhealthyThreshold: 5, port: "8011", interval: 60, timeout: 30 },
});

const ipfsListener = ipfsTarget.createListener("gitcoin-dpopp-ipfs", {
  protocol: "HTTP",
  port: 5001,
});

const ipfsHealthcheckTarget = alb.createTargetGroup("dpopp-ipfs-healthcheck", {
  vpc,
  port: 8011,
  protocol: "HTTP",
  healthCheck: { path: "/", unhealthyThreshold: 5, port: "8011", interval: 60, timeout: 30 },
});

const ipfsHealthcheckListener = ipfsHealthcheckTarget.createListener("ipfs-healthcheck", {
  protocol: "HTTP",
  port: 8011,
});

const ipfsWS = alb.createTargetGroup("dpopp-ipfs-ws", {
  vpc,
  port: 8081,
  protocol: "HTTP",
  healthCheck: { path: "/", unhealthyThreshold: 5, port: "8011", interval: 60, timeout: 30 },
});

const ifpsWSListener = ipfsWS.createListener("ipfs-ws", {
  protocol: "HTTP",
  port: 8081,
});

// Create a DNS record for the load balancer
const www = new aws.route53.Record("www", {
  zoneId: route53Zone,
  name: domain,
  type: "A",
  aliases: [
    {
      name: httpsListener.endpoint.hostname,
      zoneId: httpsListener.loadBalancer.loadBalancer.zoneId,
      evaluateTargetHealth: true,
    },
  ],
});

function makeCmd(inputbucketName: pulumi.Input<string>, inputIpfsUrl: pulumi.Input<string>): pulumi.Output<string[]> {
  let bucketName = pulumi.output(inputbucketName);
  let ipfsUrl = pulumi.output(inputIpfsUrl);
  return pulumi.all([bucketName, ipfsUrl]).apply((t: [string, string]) => {
    const bucketName = t[0];
    const ipfsUrl = t[1];
    return [
      "--port",
      "80",
      "--hostname",
      "0.0.0.0",
      "--network",
      "elp",
      "--ipfs-api",
      ipfsUrl,
      "--log-to-files",
      "--cors-allowed-origins",
      ".*",
      "--state-store-s3-bucket",
      bucketName,
      "--ethereum-rpc",
      rpcUrl,
      "--verbose",
    ];
  });
}

export const ceramicCommand = makeCmd(
  ceramicStateBucketName,
  pulumi.interpolate`http://${httpListener.endpoint.hostname}:5001`
);

const service = new awsx.ecs.FargateService("dpopp-ceramic", {
  cluster,
  desiredCount: 1,
  subnets: vpc.privateSubnetIds,
  enableExecuteCommand: true,
  taskDefinitionArgs: {
    containers: {
      ceramic: {
        image: "ceramicnetwork/js-ceramic:daf32d0470a0c378a52cb4884020526c6718ec44",
        memory: 8192,
        cpu: 4096,
        portMappings: [httpsListener],
        links: [],
        command: ceramicCommand,
        "ulimits": [
          {
              "name": "nofile",
              "hardLimit": 1000000,
              "softLimit": 1000000
          }
        ],
        environment: [
          { name: "NODE_ENV", value: "production" },
          { name: "AWS_ACCESS_KEY_ID", value: usrS3Key },
          { name: "AWS_SECRET_ACCESS_KEY", value: usrS3Secret },
          { name: "NODE_OPTIONS", value: "--max-old-space-size=7168" },
          { name: "CERAMIC_STREAM_CACHE_LIMIT", value: "20000" },
          { name: "CERAMIC_DISABLE_PUBSUB_UPDATES", value: "false" },
        ],
      },
    },
  },
});

const serviceIPFS = new awsx.ecs.FargateService("dpopp-ipfs", {
  cluster,
  desiredCount: 1,
  subnets: vpc.privateSubnetIds,
  enableExecuteCommand: true,
  taskDefinitionArgs: {
    containers: {
      ipfs: {
        image: "ceramicnetwork/go-ipfs-daemon:15f69c080be97fc884552a7fbdca5778f492e47d", 
        memory: 12288,
        cpu: 4096,
        portMappings: [ceramicListener, ipfsListener, ipfsHealthcheckListener, ifpsWSListener],
        links: [],
        "ulimits": [
          {
              "name": "nofile",
              "hardLimit": 1000000,
              "softLimit": 1000000
          }
        ],
        environment: [
          { name: "IPFS_ENABLE_S3", value: "true" },
          { name: "IPFS_S3_REGION", value: "us-east-1" },
          { name: "IPFS_S3_BUCKET_NAME", value: ipfsBucketName },
          { name: "IPFS_S3_ROOT_DIRECTORY", value: "root" },
          { name: "IPFS_S3_ACCESS_KEY_ID", value: usrS3Key },
          { name: "IPFS_S3_SECRET_ACCESS_KEY", value: usrS3Secret },
          { name: "IPFS_S3_KEY_TRANSFORM", value: "next-to-last/2" },
          { name: "GOLOG_LOG_LEVEL", value: "info" },
          { name: "GODEBUG", value: "gctrace=1" },
        ],
        mountPoints: [
          {
            sourceVolume: "dpopp-ipfs-data-volume",
            containerPath: "/data/ipfs",
          },
        ],
      },
    },
    volumes: [
      {
        name: `dpopp-ipfs-data-volume`,
        efsVolumeConfiguration: {
          fileSystemId: efs.id,
          transitEncryption: "ENABLED",
        },
      },
    ],
  },
});

export const ceramicUrl = pulumi.interpolate`https://${domain}`;
