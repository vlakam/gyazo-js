require('dotenv').config();

const fs = require('fs');
const { resolve, relative, isAbsolute } = require('path');
const fastify = require('fastify')();
const fastifyMultipart = require('fastify-multipart');
const { PNG } = require('pngjs');
const { promisify } = require('util');

let { SERVE_URI, STORAGE, PORT, URL, UPLOAD_URI } = process.env;
if (!PORT) (PORT = 8081), console.log('Port defaulted to 8081');
if (!STORAGE) (STORAGE = './storage'), console.log('Storage folder defaulted to ./storage');
if (!SERVE_URI) (SERVE_URI = '/'), console.log('Path defaulted to /');
if (!URL) (URL = 'http://localhost/'), console.log('URL defaulted to http://localhost/');
if (!UPLOAD_URI) (UPLOAD_URI = '/upload'), console.log(`Upload URI defaulted to /upload`);

STORAGE = resolve(process.cwd(), STORAGE);
if (!fs.existsSync(STORAGE)) fs.mkdirSync(STORAGE);

const accessFile = promisify(fs.access);
const genRandomString = () => {
    const vocab = '_-=0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const length = 7;

    return new Array(length)
        .fill(0)
        .map(() => {
            return vocab[Math.floor(Math.random() * vocab.length)];
        })
        .join('');
};

const subdir = (parent, dir) => {
    const relativePath = relative(parent, dir);
    return relativePath && !relativePath.startsWith('..') && !isAbsolute(relativePath);
};

fastify.register(fastifyMultipart, {
    limits: {
        files: 1,
        fields: 0,
    },
});

fastify.get(`${SERVE_URI}:pictureId`, async (req, res) => {
    const { pictureId } = req.params;
    const filePath = resolve(STORAGE, pictureId);
    if (!subdir(STORAGE, filePath)) {
        return res.status(404).send('Not found');
    }

    try {
        await accessFile(filePath, fs.constants.F_OK | fs.constants.R_OK);
    } catch (err) {
        return res.status(404).send('Not found');
    }
    
    const stream = fs.createReadStream(filePath);
    return res.type('image/png').send(stream);
});

fastify.post(`${UPLOAD_URI}`, async (req, res) => {
    const data = await req.file();
    let fileName = `${genRandomString()}.png`;
    let filePath = resolve(STORAGE, fileName);
    while (fs.existsSync(filePath)) {
        fileName = `${genRandomString()}.png`;
        filePath = resolve(STORAGE, fileName);
    }

    try {
        data.file
            .pipe(new PNG({ deflateLevel: 6 }))
            .on('parsed', function () {
                this.pack().pipe(fs.createWriteStream(filePath));

                res.send(`${URL}${fileName}`);
                console.log(`${new Date().toString()} ${req.ip} sent ${fileName} image ${URL}${fileName}`);
            })
            .on('error', (error) => {
                res.status(415).send(`${error}`);
            });
    } catch (err) {
        console.error(`Shit happened: ${error}`);
    }
});

const start = async () => {
    await fastify.listen(parseInt(PORT));
    console.log(
        `server listening on ${fastify.server.address().port}, saving pictures to ${STORAGE}, servicing on ${SERVE_URI}`,
    );
};

start();
