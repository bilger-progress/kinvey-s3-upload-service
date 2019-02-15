"use-strict"

// External dependencies.
const kinveyFlexSDK = require("kinvey-flex-sdk");
const requestPromise = require("request-promise");
const awsSDK = require("aws-sdk");

// Service version.
const { version: serviceVersion } = require("./package.json");

/**
 * TODO: Add the file ID.
 * This File should be available on Kinvey Files.
 */
const FILE_ID = "xxx";

// TODO: Add the S3 bucket name. 
const AWS_BUCKET_NAME = "xxx"

// S3 configs.
awsSDK.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});
const s3 = new awsSDK.S3();

// Initialize Kinvey Flex.
kinveyFlexSDK.service((err, flex) => {
    if (err) {
        console.log("Error while initializing Flex!");
        return;
    }
    // Register Flex Function.
    flex.functions.register("upload", (context, complete, modules) => {
        return requestPromise({
            method: "GET",
            uri: "https://baas.kinvey.com/blob/" + modules.backendContext.getAppKey() + "/" + FILE_ID,
            headers: {
                Authorization: context.headers["authorization"]
            },
            json: true
        }).then((gcsData) => {
            return requestPromise({
                uri: gcsData._downloadURL,
                method: "GET",
                encoding: null
            });
        }).then((fileData) => {
            return promisify((callback) => {
                return s3.upload({
                    Bucket: AWS_BUCKET_NAME,
                    Body: fileData,
                    Key: FILE_ID
                }, callback);
            });
        }).then((awsData) => {
            console.log(awsData);
            return complete().setBody({
                success: "true",
                debug: "Success. Please check logs.",
                serviceVersion: serviceVersion
            }).ok().next();
        }).catch((error) => {
            console.error(error);
            return complete().setBody({
                success: false,
                debug: "Error occured. Please check logs.",
                serviceVersion: serviceVersion
            }).runtimeError().done();
        });
    });
});

const promisify = function (foo) {
    return new Promise(function (resolve, reject) {
        foo(function (error, result) {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
};
