'use strict'

const expect = require('chai').expect
const Rekognition = require('../../AWS/rekognition')
const S3 = require('../../AWS/S3')
const parameters = require('../../parameters')

const debug = require('debug')('IAIRekognition:test:Rekognition')

const rekognition = new Rekognition(parameters.AWS)
const s3 = new S3(parameters.AWS)

let imageFile, sourceImageFile, targetImageFile, billGatesFile, moderationFile
let facesIdsIndexed = []
const collectionId = new Date().getTime() + 'test'

describe('IAIRekognition', function () {
    this.timeout(10000)

    before( async function () {
        const imagePaths = [
            __dirname + '/../../images/run.jpg',
            __dirname + '/../../images/Mark_Zuckerberg.jpg',
            __dirname + '/../../images/Mark_Zuckerberg_and_wife2.jpg',
            __dirname + '/../../images/Bill_Gates.jpg',
            __dirname + '/../../images/volley_beach.jpg'
        ]

        const s3Images = await s3.uploadMultiple(imagePaths, parameters.defaultFolder)
        imageFile = s3Images[0].Key
        sourceImageFile = s3Images[1].Key
        targetImageFile = s3Images[2].Key
        billGatesFile = s3Images[3].Key
        moderationFile = s3Images[4].Key
    })

    it('detect labels should response ok and have labels', async function () {
        const imageLabels = await rekognition.detectLabels(parameters.AWS.bucket, imageFile)

        expect(imageLabels).to.have.property('Labels')
        expect(imageLabels.Labels).to.be.an('array')
        imageLabels.Labels.forEach(function (element) {
            expect(element).to.have.property('Name')
            expect(element).to.have.property('Confidence')
        })
    })

    it('detect faces should response ok and have details', async function () {
        const imageFaces = await rekognition.detectFaces(parameters.AWS.bucket, imageFile)

        expect(imageFaces).to.have.property('FaceDetails')
        expect(imageFaces.FaceDetails).to.be.an('array')
        imageFaces.FaceDetails.forEach(function (element) {
            expect(element).to.have.property('BoundingBox')
            expect(element).to.have.property('Landmarks')
            expect(element).to.have.property('Pose')
            expect(element).to.have.property('Quality')
            expect(element).to.have.property('Confidence')
        })
    })

    it('compare faces of Mark_Zuckerberg and Mark_Zuckerberg_and_wife2 should match and unmatch', async function () {  
        const faceMatches = await rekognition.compareFaces(parameters.AWS.bucket, sourceImageFile, targetImageFile)

        expect(faceMatches).to.have.property('FaceMatches')
        expect(faceMatches).to.have.property('UnmatchedFaces')
        expect(faceMatches.FaceMatches).to.be.an('array')
        expect(faceMatches.UnmatchedFaces).to.be.an('array')
        expect(faceMatches.FaceMatches.length).to.be.equal(1)
        expect(faceMatches.UnmatchedFaces.length).to.be.equal(1)
        faceMatches.FaceMatches.forEach(function (element) {
            expect(element).to.have.property('Similarity')
            expect(element).to.have.property('Face')
        })
    })

    it('compare faces of Mark_Zuckerberg and Bill_Gates should unmatch', async function () {
        const faceMatches = await rekognition.compareFaces(parameters.AWS.bucket, sourceImageFile, billGatesFile)

        expect(faceMatches).to.have.property('FaceMatches')
        expect(faceMatches).to.have.property('UnmatchedFaces')
        expect(faceMatches.FaceMatches).to.be.an('array')
        expect(faceMatches.UnmatchedFaces).to.be.an('array')
        expect(faceMatches.FaceMatches.length).to.be.equal(0)
        expect(faceMatches.UnmatchedFaces.length).to.be.equal(1)
        faceMatches.FaceMatches.forEach(function (element) {
            expect(element).to.have.property('Similarity')
            expect(element).to.have.property('Face')
        })
    })

    it('detect moderation labels should response ok and have details', async function () {
        const moderationLabels = await rekognition.detectModerationLabels(parameters.AWS.bucket, moderationFile)

        expect(moderationLabels).to.have.property('ModerationLabels')
        expect(moderationLabels.ModerationLabels).to.be.an('array')
        moderationLabels.ModerationLabels.forEach(function (element) {
            expect(element).to.have.property('Name')
            expect(element).to.have.property('Confidence')
            expect(element).to.have.property('ParentName')
        })
    })

    it('create collection should response ok', async function () {
        const collection = await rekognition.createCollection(collectionId)
        
        expect(collection).to.have.property('CollectionArn')
        expect(collection).to.have.property('StatusCode')
        expect(collection.StatusCode).to.be.equal(200)
    })

    it('index faces of Mark_Zuckerberg_and_wife2 should response ok', async function () {
        const facesIndexed = await rekognition.indexFaces(parameters.AWS.bucket, collectionId, targetImageFile)
        
        expect(facesIndexed).to.have.property('FaceRecords')
        expect(facesIndexed.FaceRecords.length).to.be.equal(2)
        facesIndexed.FaceRecords.forEach(function (face) {
            expect(face).to.have.property('Face')
            expect(face).to.have.property('FaceDetail')

            facesIdsIndexed.push(face.Face.FaceId)
        })
    })

    it('search faces by faceId should response ok', async function () {
        const facesIndexed = await rekognition.indexFaces(parameters.AWS.bucket, collectionId, sourceImageFile)
        const newFaceId = facesIndexed.FaceRecords[0].Face.FaceId
        
        const faceMatches = await rekognition.searchFacesByFaceId(collectionId, newFaceId)
        
        expect(faceMatches).to.have.property('FaceMatches')
        expect(faceMatches.FaceMatches.length).to.be.equal(1)
        faceMatches.FaceMatches.forEach(function (face) {
            expect(face).to.have.property('Face')
            expect(face).to.have.property('Similarity')
        })
    })

    it('search faces by image should response ok', async function () {
        const faceMatches = await rekognition.searchFacesByImage(parameters.AWS.bucket, collectionId, sourceImageFile)
        
        expect(faceMatches).to.have.property('FaceMatches')
        expect(faceMatches.FaceMatches.length).to.be.equal(2)
        faceMatches.FaceMatches.forEach(function (face) {
            expect(face).to.have.property('Face')
            expect(face).to.have.property('Similarity')
        })
    })

    it('list faces should response ok', async function () {
        const faces = await rekognition.listFaces(collectionId)
                
        expect(faces).to.have.property('Faces')
        expect(faces.Faces.length).to.be.equal(3)
        faces.Faces.forEach(function (face) {
            expect(face).to.have.property('FaceId')
            expect(face).to.have.property('ImageId')
        })
    })
})
