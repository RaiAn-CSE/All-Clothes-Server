const express = require('express');


const app = express()

const cors = require('cors');

const jwt = require('jsonwebtoken');
require('dotenv').config()

const stripe = require("stripe")(process.env.STRIPE_SK_KEY);

app.use(cors())
app.use(express.json())

const port = process.env.PORT || 5000

app.get('/', async (req, res) => {
    res.send("Server is running")
})



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.7kbtzra.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });




async function run() {

    //collections start
    const categoriesCollections = client.db("puranClothes").collection("categories")
    const mensCollections = client.db("puranClothes").collection("menClothes")
    const womensCollections = client.db("puranClothes").collection("womenClothes")
    const childsCollections = client.db("puranClothes").collection("childClothes")
    const usersCollections = client.db("puranClothes").collection("users")
    const bookingsCollections = client.db("puranClothes").collection("bookings")
    const reportedCollections = client.db("puranClothes").collection("reported")
    const paymentCollections = client.db("puranClothes").collection("payments")


    // collections end 

    function verifyJWT(req, res, next) {
        console.log("token inside", req.headers.authorization);

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            res.status(401).send('Unauthorized access')
        } else {
            const token = authHeader.split(' ')[1]

            jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
                if (err) {
                    res.status(403).send({ message: 'forbidden' })
                }
                req.decoded = decoded
                next()
            })
        }


    }


    //jwt
    app.get('/jwt', async (req, res) => {
        const email = req.query.email;
        const query = { email: email }
        const user = await usersCollections.findOne(query)
        if (user) {
            const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '24h' });
            return res.send({ accessToken: token })
        } else {
            res.status(403).send({ accessToken: '' })
        }

    })

    //find all categories
    app.get('/categories', async (req, res) => {
        const query = {}
        const result = await categoriesCollections.find(query).toArray()
        res.send(result)

    })

    //find specific category
    app.get('/category/:id', async (req, res) => {
        const id = req.params.id;
        const query = {}

        if (id == 1) {
            const result = await mensCollections.find(query).toArray()
            res.send(result)
        } else if (id == 2) {
            const result = await womensCollections.find(query).toArray()
            res.send(result)
        } else if (id == 3) {
            const result = await childsCollections.find(query).toArray()
            res.send(result)
        }


    })

    //stored users in the databage
    app.post('/users', async (req, res) => {
        const data = req.body;
        console.log(data);
        const result = await usersCollections.insertOne(data)
        res.send(result)
    })

    //delete a  users
    app.delete('/allusers/:id', async (req, res) => {
        // const decodedEmail = req.decoded.email;



        // const filter = { email: decodedEmail }

        // const user = await usersCollections.findOne(filter)


        // if (!user?.isAdmin) {
        //     return res.status(403).send({ message: 'Forbidden access' })
        // }

        const id = req.params.id;

        // user query 
        const query = { _id: ObjectId(id) }


        //delete buyers booking



        // delete products of sellers
        const search = await usersCollections.findOne(query)
        console.log(search);
        const email = search.email

        let updateResult;
        if (search.role == 'Seller') {

            const filter = { sellerEmail: email }


            if (await mensCollections.findOne(filter)) {

                updateResult = await mensCollections.deleteMany(filter)

            } else if (await womensCollections.findOne(filter)) {

                updateResult = await womensCollections.deleteMany(filter)

            } else if (await childsCollections.findOne(filter)) {

                updateResult = await childsCollections.deleteMany(filter)

            }

        }

        if (search.role == 'User') {
            const filter = { buyerEmail: email }

            updateResult = await bookingsCollections.deleteMany(filter)
        }

        //delete user



        const result = await usersCollections.deleteOne(query);
        res.send(result)
    })

    //check users type to log in
    app.get('/users', async (req, res) => {
        const email = req.query.email;
        const role = req.query.role;
        const users = await usersCollections.find({}).toArray()

        const search = users.find(user => user.email === email)
        console.log("Search value", search);


        if (search?.role == role) {
            res.send({ isFound: 'Yes' })
        } else {
            res.send({ isFound: 'No' })
        }
    })

    //all users
    app.get('/allUsers', async (req, res) => {

        res.send(await usersCollections.find({}).toArray())
    })



    //check role
    app.get('/role', async (req, res) => {
        const email = req.query.email;
        console.log(email);
        const allusers = await usersCollections.find({}).toArray()
        const search = allusers.find(user => user.email == email)
        if (search) {
            const admin = search.isAdmin;
            const userType = search.role;
            if (admin) {
                res.send({ isAdmin: 1, role: userType })
            } else {

                res.send({ isAdmin: 0, role: userType })
            }
        }
    })

    //all buyers
    app.get('/allBuyers', async (req, res) => {

        const allusers = await usersCollections.find({}).toArray()

        const buyers = allusers.filter(user => user.role === 'User' && !user.isAdmin)
        res.send(buyers)
    })

    //all sellers
    app.get('/allSellers', async (req, res) => {

        const allusers = await usersCollections.find({}).toArray()

        const sellers = allusers.filter(user => user.role === 'Seller' && !user.isAdmin)
        res.send(sellers)
    })


    //seller
    //add product

    app.post('/addProduct', async (req, res) => {
        const product = req.body;
        console.log(product);
        let result;
        if (product.categoryId == 1) {

            result = await mensCollections.insertOne(product)

        } else if (product.categoryId == 2) {

            result = await womensCollections.insertOne(product)

        } else if (product.categoryId == 3) {

            result = await childsCollections.insertOne(product)

        }

        res.send(result)
    })




    //find specific product of the seller
    app.get('/myproduct', verifyJWT, async (req, res) => {
        const email = req.query.email;
        console.log('myproduct', email);

        let myProducts = []

        //mens
        const menProduct = await mensCollections.find({}).toArray()
        const myMenProduct = menProduct.filter(product => product.sellerEmail === email)

        //womens
        const womenProduct = await womensCollections.find({}).toArray()
        const myWomenProduct = womenProduct.filter(product => product.sellerEmail === email)

        //child
        const childProduct = await childsCollections.find({}).toArray()
        const myChildProduct = childProduct.filter(product => product.sellerEmail === email)


        //combined all
        myProducts = [...myMenProduct, ...myWomenProduct, ...myChildProduct]

        res.send(myProducts)
    })


    //delete sellers product
    app.delete('/deleteProducts/:id', async (req, res) => {
        const id = req.params.id;
        console.log("delete my product", id);
        let result;

        const query = { _id: ObjectId(id) }

        //check 
        if (await mensCollections.findOne(query)) {

            result = await mensCollections.deleteOne(query)

        } else if (await womensCollections.findOne(query)) {

            result = await womensCollections.deleteOne(query)

        } else if (await childsCollections.findOne(query)) {

            result = await childsCollections.deleteOne(query)

        }
        res.send(result)
    })


    //update advertise value
    app.patch('/updateAdvertise/:id', verifyJWT, async (req, res) => {
        const id = req.params.id;
        console.log("update advertise", id);

        let result;
        const filter = { _id: ObjectId(id) }

        const updateDoc = {
            $set: {
                advertise: 1
            },
        };

        //check 
        if (await mensCollections.findOne(filter)) {

            result = await mensCollections.updateOne(filter, updateDoc)

        } else if (await womensCollections.findOne(filter)) {

            result = await womensCollections.updateOne(filter, updateDoc)

        } else if (await childsCollections.findOne(filter)) {

            result = await childsCollections.updateOne(filter, updateDoc)

        }
        res.send(result)
    })


    //get all advertised products
    app.get('/allAdvertiseProducts', async (req, res) => {


        const query = { advertise: 1 }

        const menData = await mensCollections.find(query).toArray()
        const womenData = await womensCollections.find(query).toArray()
        const childData = await childsCollections.find(query).toArray()

        const allData = [...menData, ...womenData, ...childData]

        res.send(allData)
    })

    //update verifyStatus
    app.put('/verifyStatus', async (req, res) => {
        const email = req.query.email;
        console.log("update advertise", email);


        const filter = { email: email }

        const updateDoc = {
            $set: {
                verified: 1
            },
        };

        //check 
        const search = { sellerEmail: email }

        const result = await usersCollections.updateOne(filter, updateDoc)

        const menProductVerified = await mensCollections.updateMany(search, updateDoc)
        const womenProductVerified = await womensCollections.updateMany(search, updateDoc)
        const childProductVerified = await childsCollections.updateMany(search, updateDoc)

        res.send(result)
    })

    //book product
    app.post('/bookings', async (req, res) => {
        const data = req.body;
        const result = await bookingsCollections.insertOne(data)
        res.send(result)
    })


    //get my book products
    app.get('/bookings', verifyJWT, async (req, res) => {
        const email = req.query.email;
        console.log("book email", email);
        const decodedEmail = req.decoded?.email;

        if (decodedEmail !== email) {
            res.status(403).send({ message: 'forbidden' })
        }

        const query = { buyerEmail: email }
        console.log("Book query", query);
        const result = await bookingsCollections.find(query).toArray()
        console.log("book result", result);
        res.send(result)
    })

    //delete booked product
    app.delete('/bookings/:id', async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) }
        const result = await bookingsCollections.deleteOne(filter)
        res.send(result)
    })

    //get specific booked product
    app.get('/bookings/:id', verifyJWT, async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) }
        const result = await bookingsCollections.findOne(query)
        res.send(result)
    })

    //reported items
    app.post('/reportedItems', async (req, res) => {
        const data = req.body;
        const result = await reportedCollections.insertOne(data)
        res.send(result)
    })

    //show reported items
    app.get('/reportedItems', verifyJWT, async (req, res) => {
        res.send(await reportedCollections.find({}).toArray())
    })

    //delete reported items
    app.delete('/deleteReportedItems', async (req, res) => {

        const sellerEmail = req.query.sellerEmail;
        const productName = req.query.productName;

        const query = { sellerEmail, productName }

        const deleteFromReport = await reportedCollections.deleteOne(query)



        let result

        //check 
        if (await mensCollections.findOne(query)) {

            result = await mensCollections.deleteOne(query)

        } else if (await womensCollections.findOne(query)) {

            result = await womensCollections.deleteOne(query)

        } else if (await childsCollections.findOne(query)) {

            result = await childsCollections.deleteOne(query)

        }
        res.send(result)


    })


    //payment
    app.post("/create-payment-intent", async (req, res) => {
        const booking = req.body;
        console.log(booking);
        const amount = booking.price * 100
        console.log(amount);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: "usd",
            "payment_method_types": [
                "card"
            ]
        });

        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    })

    // store payment info 
    app.post('/payments', async (req, res) => {

        // store in payment collection 
        const payment = req.body;

        console.log(payment);
        const result = await paymentCollections.insertOne(payment)


        // update paid status 
        const id = payment.bookingId;
        const filter = { _id: ObjectId(id) }

        let updateDoc = {
            $set: {
                paid: 1,
            }
        }

        const updateResult = await bookingsCollections.updateOne(filter, updateDoc)

        //update sale status
        const pid = payment.productId;


        const query = { _id: ObjectId(pid) }

        updateDoc = {
            $set: {
                saleStatus: 'Sold'
            }
        }

        let output;

        if (await mensCollections.findOne(query)) {
            output = await mensCollections.updateOne(query, updateDoc)

        } else if (await womensCollections.findOne(query)) {

            output = await womensCollections.updateOne(query, updateDoc)

        } else if (await childsCollections.findOne(query)) {

            output = await childsCollections.updateOne(query, updateDoc)
        }

        //delete others bookings
        const deleteQuery = { productId: pid, paid: 0 }
        const deleteOthersBooking = await bookingsCollections.deleteMany(deleteQuery)

        res.send(result)
    })

    //get all orders

    app.get('/payments', verifyJWT, async (req, res) => {
        res.send(await paymentCollections.find({}).toArray())
    })


}
run().catch(error => console.log(error))

app.listen(port, () => {
    console.log("Server is running on port ", port);
})