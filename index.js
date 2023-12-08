const express = require('express')
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

//middle ware
app.use(cors());
app.use(express.json());

// Connect MongoDB 
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.4k6eqxi.mongodb.net/?retryWrites=true&w=majority`;
console.log("server Connect")

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyJWT = (req, res, next) =>{
    const authHeaders = req.headers.authorization;
    if(!authHeaders){
      return res.status(401).send({message: 'Unauthorized Access'})
    }
    const token = authHeaders.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(error, decoded){
      if(error){
        return res.status(401).send({message: 'Unauthorized Access'})
      }
      req.decoded = decoded;
      next();
    })
}

async function run() {
  try {
    const gameCollection = client.db('gameAddict').collection('games');
    const orderCollections = client.db('gameAddict').collection('orders');
    const commentCollection = client.db('gameAddict').collection('comments');

    app.post('/jwt', (req, res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1d'});
      res.send({token})
    })
    
    app.get('/games', async(req,res)=>{
        const query = {};
        const cursor = gameCollection.find(query);
        const games = await cursor.toArray();
        res.send(games);
    });

    app.get('/games/:id', async(req, res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)};
        const games = await gameCollection.findOne(query);
        res.send(games);
    });

    //order api
    app.post('/orders', async(req, res)=>{
      const order = req.body;
      const result = await orderCollections.insertOne(order);
      res.send(result);
    });

    app.get('/orders',verifyJWT, async(req, res)=>{
      const decoded = req.decoded;
      if(decoded.email !== req.query.email){
          return res.status(403).send({message: 'Unauthorized Access'})
      }
      let query = {};
      if(req.query.email){
        query = {
          email: req.query.email
        };
      }
      const cursor = orderCollections.find(query);
      const orders = await cursor.toArray();
      res.send(orders);
    });

    app.patch("/orders/:id", async(req,res)=>{
      const id = req.params.id;
      const status = req.body.status;
      const query = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set:{
          status: status
        }
      }
      const result = await orderCollections.updateOne(query, updatedDoc);
      res.send(result);
    })

    app.delete('/orders/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await orderCollections.deleteOne(query);
      res.send(result);
    })

    app.post('/comments', async(req, res)=>{
      const comment = req.body;
      const result = await commentCollection.insertOne(comment);
      res.send(result);
    });
  } 
  finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res)=>{
    res.send('Game Addict server is running')
});

app.listen(port, ()=>{
    console.log(`Game addict server on port ${port}`)
})