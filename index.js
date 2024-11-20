
const express = require('express')
const app = express();
require('dotenv').config()
const cors = require('cors')
var jwt = require('jsonwebtoken');
const port = process.env.PORT || 4000;


// middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tthwvj5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const testimonialCollection = client.db('shopNest').collection('reviews');
        const featuredCollection = client.db('shopNest').collection('featuredProduct')
        const categoryCollection = client.db('shopNest').collection('category')


        // jwt related api
        app.post('/jwt', async(req, res) =>{
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
            res.send({token})
        })

        // get testimonial data in db
        app.get('/testimonial', async(req, res) =>{
            const result = await testimonialCollection.find().toArray();
            res.send(result);
        }) 

        // get featured product data in db
        app.get('/featured', async(req, res) =>{
            const result = await featuredCollection.find().toArray();
            res.send(result);
        })

        // get category product in db
        app.get('/category', async(req, res) =>{
            const result = await categoryCollection.find().toArray();
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', async (req, res) => {
    res.send('shop nest quest is running')
})

app.listen(port, () => {
    console.log(`shop quest is running on port: ${port}`)
})