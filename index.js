
const express = require('express')
const app = express();
require('dotenv').config()
const cors = require('cors')
var jwt = require('jsonwebtoken');
const port = process.env.PORT || 4000;


// middleware
app.use(cors());
app.use(express.json());


// verify token
const verifyJWT = (req, res, next) => {
    const authorization = req.header.authorization;
    if (!authorization) {
        return res.send({ message: 'No Token' })
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.send({ message: 'Invalid Token' })
        }
        req.decoded = decoded;
        next();
    })
}

// verify seller
const verifySeller = async (req, res, next) =>{
    const email = req.decoded.email
    const query = {email: email}
    const user = await usersCollection.findOne(query)
    if(user?.role !== 'seller'){
        return res.send({message: 'Forbidden Access'})
    }
    next();
}



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const usersCollection = client.db('shopNest').collection('users')
        const allProductsCollection = client.db('shopNest').collection('allProducts')
        const wishCollection = client.db('shopNest').collection('wishList')


        // jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })

        // get testimonial data in db
        app.get('/testimonial', async (req, res) => {
            const result = await testimonialCollection.find().toArray();
            res.send(result);
        })

        // get featured product data in db
        app.get('/featured', async (req, res) => {
            const result = await featuredCollection.find().toArray();
            res.send(result);
        })

        // get category product in db
        app.get('/category', async (req, res) => {
            const result = await categoryCollection.find().toArray();
            res.send(result);
        })

        // save user data in db
        app.put('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user?.email }


            // check if user already in db
            const isExist = await usersCollection.findOne(query)
            if (isExist) {
                if (user.status === 'Requested') {
                    const result = await usersCollection.updateOne(query, { $set: { status: user?.status } })
                    return res.send(result)
                } else {
                    return res.send(isExist)
                }
            }

            // save user for the first time
            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    ...user,
                    timeStamp: Date.now()
                }
            }
            const result = await usersCollection.updateOne(query, updateDoc, options)
            res.send(result)

        })

        // get user role in db
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const result = await usersCollection.findOne({ email });
            res.send(result);
        })

        // get all products
        app.get('/all-products', async (req, res) => {
            // name searching
            // sort by price
            // filter by category
            // filter by brand
            const { name, sort, category, brand, page = 1, limit = 9 } = req.query

            const query = {}

            if (name) {
                query.name = { $regex: name, $options: "i" }
            }

            if (category) {
                query.category = { $regex: category, $options: "i" }
            }

            if (brand) {
                query.brand = brand
            }

            const pageNumber = Number(page)
            const limitNumber = Number(limit)

            const sortOption = sort === 'asc' ? 1 : -1

            const products = await allProductsCollection.find(query).skip((pageNumber - 1) * limitNumber).limit(limitNumber).sort({ price: sortOption }).toArray();

            const totalProducts = await allProductsCollection.countDocuments(query)



            const categories = [... new Set(products.map((product) => product.category))]
            const brands = [... new Set(products.map((product) => product.brand))]


            res.json({ products, brands, categories, totalProducts });
        })

        // get all user data from db
        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        })

        // change the role in db
        app.patch('/users/update/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const query = { email }
            const updateDoc = {
                $set: {
                    ...user,
                    Timestamp: Date.now()
                }
            }
            const result = await usersCollection.updateOne(query, updateDoc);
            res.send(result);
        })

        // delete user in db
        app.delete('/user/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })

        // save a product data in db
        app.post('/product', async (req, res) => {
            const productData = req.body;
            const result = await allProductsCollection.insertOne(productData);
            res.send(result);
        })

        // get all product from seller
        app.get('/my-listings/:email', async (req, res) => {
            const email = req.params.email

            let query = { 'seller.email': email }
            const result = await allProductsCollection.find(query).toArray();
            res.send(result);
        })

        // update room data
        app.put('/product/update/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const productData = req.body;
            const updateDoc = {
                $set: productData,
            }
            const result = await allProductsCollection.updateOne(query, updateDoc)
            res.send(result);
        })

        // delete a booking data
        app.delete('/room/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await allProductsCollection.deleteOne(query);
            res.send(result);
        })

        // add to wishlist
        app.post('/wishlist', async (req, res) => {
            const cartItem = req.body;
            const result = await wishCollection.insertOne(cartItem);
            res.send(result);
        })

        // get wishlist data based on user
        app.get('/wish/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await wishCollection.find(query).toArray();
            res.send(result);
        })

        // delete wish data in db
        app.delete('/delete-wish/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await wishCollection.deleteOne(query)
            res.send(result);
        })

        // get product based on id
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await allProductsCollection.findOne(query)
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