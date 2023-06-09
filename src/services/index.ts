import { docClient, s3bucket } from '../config/db'
import { v4 as uuidv4 } from 'uuid';

import { S3 } from 'aws-sdk';
import { ManagedUpload } from 'aws-sdk/lib/s3/managed_upload';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { Details, UpdateDetails } from '../types';
import xlsx from 'sheetjs-style';



export const insert = (data: Details, file: Express.Multer.File) => {
    try {
        const s3Params: S3.PutObjectRequest = {
            Bucket: 'team1backendbucket',
            Key: uuidv4() + ',' + file.originalname,
            Body: file.buffer,
            ACL: 'public-read-write',
        };
        s3bucket.upload(s3Params, (err: Error, s3Data: ManagedUpload.SendData & S3.ManagedUpload.SendData) => {
            if (err) {
                console.error(err);
            } else {
                // Store file information in DynamoDB
                const params: DocumentClient.PutItemInput = {
                    TableName: "podetails",
                    Item: {
                        ponumber: data.po_id,
                        details: data.items,
                        date: data.date,
                        poname: data.poname,
                        projectName: data.projectName,
                        filename: data.filename,
                        filePath: s3Data.Location
                    },
                };
                docClient.put(params, (err) => {
                    if (err) {
                        console.error("Unable to add po details", err);
                    }
                });
            }
        });
    }
    catch (e) {
        console.log("hi")
    }
}

export const getAllPOItems = async () => {
    const params: DocumentClient.ScanInput = {
        TableName: "podetails",
    };
    const po = await docClient.scan(params).promise();
    return po;
};



export const getDetailsWithID = async (id: string) => {
    const params: DocumentClient.GetItemInput = {
        TableName: "podetails",
        Key: {
            ponumber: id,
        },
    };
    const data = (await docClient.get(params).promise());
    
    return data;
};



export const updatePOData = async (id: string, data: UpdateDetails[]) => {
    const itemslist = data.map(
        ({ description, amount, dmrNo = "", raisedAmount = "", date }) => ({
            description: description,
            amount: amount,
            dmrNo: dmrNo,
            raisedAmount: raisedAmount,
            date: date
            ,
        })
    );
    const params: DocumentClient.Update = {
        TableName: "podetails",
        Key: {
            ponumber: id,
        },
        UpdateExpression: "SET #X = :X",
        ExpressionAttributeValues: {
            ":X": itemslist,
        },
        ExpressionAttributeNames: {
            "#X": "details",
        },
    };

    docClient.update(params).promise();
};


//services for EVC
export const xldownload = async() => {
    const wb: xlsx.WorkBook = xlsx.readFile('./src/resources/Output.xlsx', {
        cellFormula: true,
        type: 'binary',
        cellDates: true,
        cellStyles: true,
    });
    return wb;
};



