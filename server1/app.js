const random = require('random-js');
const app = require('express')();
const bodyParser = require('body-parser');
const server = require('http').createServer(app);
const ioBrowser = require('socket.io')(server);
const io = require("socket.io").listen(8001);
const io_client = require('socket.io-client');
const SHA256 = require('crypto-js/sha256');
const jsonSize = require('json-size');


let serverWealth = [1,3,5];
let availableServers = [0,1,0];
let formData = {};
let selectedValidator = -1;
let tsuccess;

let server0HasBeenAlive = false;
let server2HasBeenAlive = false;


app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

app.use(bodyParser());

app.post('/', function(req, res){
    let From = req.body.from;
    let To = req.body.to;
    let Amount = req.body.amount;
    let Description = req.body.desc;

    formData = {from: From, to: To, amount: parseInt(Amount,10), description: Description};
    console.log(formData);

    selectedValidator = selectValidator(availableServers);
    console.log('Selected Validator is: ' + selectedValidator);
    passDataToSelectedValidator(selectedValidator);




});


const socket = io_client.connect('http://127.0.0.1:8000');

socket.on('connect', function () {
    socket.emit('server1Alive',1);
    console.log('server 1 connected to server 0');

    if (server0HasBeenAlive) {
        socket.emit('updateYourBlockchain', {blockchain:server1Chain.chain});
        console.log('Updated Blockchain sent to Server 0');
        socket.emit('updateYourServerWealth', {wealtharray:serverWealth});
        console.log('Updated Wealth array sent to Server 0');
    }
});





socket.on('disconnect', function(){
    //socket.close();
    console.log('server 1 disconnected from server 0');
    availableServers[0] = 0;
    console.log(availableServers);
    server0HasBeenAlive = true;
});




const osocket = io_client.connect('http://127.0.0.1:8002');

osocket.on('connect', function () {
    osocket.emit('server1Alive',1);
    console.log('server 1 connected to server 2');

    if (server2HasBeenAlive) {
        osocket.emit('updateYourBlockchain', {blockchain:server1Chain.chain});
        console.log('Updated Blockchain sent to Server 2');
        osocket.emit('updateYourServerWealth', {wealtharray:serverWealth});
        console.log('Updated Wealth array sent to Server 2');
    }
});






osocket.on('disconnect', function(){
    //osocket.close();
    console.log('server 1 disconnected from server 2');
    availableServers[2] = 0;
    console.log(availableServers);
    server2HasBeenAlive = true;
});



ioBrowser.on('connection', function(socket) {
    console.log('Client opened browser window on Server 1');
});



io.on('connection', function(socket){
    console.log('Another server has connected to Server 1');


    socket.on('server0Alive', function(data){
        availableServers[0] = data;
        console.log('Current available servers: ' + availableServers);
    });



    socket.on('server2Alive', function(data){
        availableServers[2] = data;
        console.log('Current available servers: ' + availableServers);
    });





    socket.on('chosenValidator', function(data){
        let currentBalance = balanceOfClient(data.from);
        formData = data;
        requestStatus(currentBalance);

    });


    socket.on('updateYourBlockchain', function(data){
        server1Chain.chain = [server1Chain.chain[0],server1Chain.chain[1],server1Chain.chain[2]];
        for (let n = 3; n<data.blockchain.length; n++){
            server1Chain.chain.push(data.blockchain[n]);
        }
        console.log('Server 1 blockchain is up to date');
        console.log(JSON.stringify(server1Chain, null, 4));


    });

    socket.on('updateYourServerWealth', function(data){
        serverWealth = data.wealtharray;
        console.log('Server 1 wealth array is up to date');
        console.log(serverWealth);

    });



    socket.on('transactionRejected', function(data){
        ioBrowser.emit('formStatus', data);

    });


    socket.on('transactionAccepted', function(data){
        ioBrowser.emit('formStatus', 'Transaction Accepted');
        serverWealth[data.server] += 3;
        console.log('Wealth of Validator Updated');

        server1Chain.chain.push(data.newblock);
        //addBlock(new Block(data.newblock.timeStamp, data.newblock.data, data.newblock.prevHash, data.newblock.hash));
        console.log('Server 1 Block Chain Updated with New Block');
        console.log(JSON.stringify(server1Chain, null, 4));

    });





    socket.on('disconnect', function(){
        io.emit('aliveCheck',{server0:availableServers[0], server1:availableServers[1], server2:availableServers[2]});
        //availableServers = [0,1,0];
        //console.log('Current available servers: ' + availableServers);

    });



});







class Block {
    constructor(timeStamp, data, prevHash = "") {
        this.timeStamp = Date.now();
        this.data = data;
        this.prevHash = prevHash;
        this.hash = this.calculateHash();
    }
    calculateHash() {
        return SHA256(this.prevHash + this.timeStamp + JSON.stringify(this.data)).toString();
    }
}



class BlockChain {
    constructor() {
// the chain is an array with an initial block (genesis block)
        this.chain = [this.createGenesisBlock()];
        //this.miningReward = 3;
    }
// create the first block. We call it the genesis block
    createGenesisBlock() {
        return new Block(Date.now(), {from:'', to:'', amount:0, description:''});
    }

// return the latest block
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }
// this function creates a new block and adds it to the chain
    addBlock(newBlock) {
//assign the pre hash
        newBlock.prevHash = this.getLatestBlock().hash;
// Now calculate the hash of the new block
        newBlock.hash = newBlock.calculateHash();
// push it to the chain
        this.chain.push(newBlock);
    }



}

let server1Chain = new BlockChain();
server1Chain.addBlock(new Block(Date.now(), {
    from:-1, to:'C1', amount:100, description:'Open Balance C1'}));

server1Chain.addBlock(new Block(Date.now(), {
    from:-1, to:'C2', amount:150, description:'Open Balance C2'}));


function balanceOfClient(from) {
    let balance = 0;
    server1Chain.chain.forEach(function(block) {
        if (block.data.from === from){
            balance -= block.data.amount;
        }

        if (block.data.to === from){
            balance += block.data.amount;
        }
    });

    return balance;
}




function requestStatus(balance) {
    if (balance < formData.amount){
        console.log('Transaction Rejected');
        ioBrowser.emit('formStatus', 'Transaction Rejected');
        socket.emit('transactionRejected', 'Transaction Rejected');
        osocket.emit('transactionRejected', 'Transaction Rejected');

    }

    else {
        server1Chain.addBlock(new Block(Date.now(), {
            from:formData.from, to:formData.to, amount:formData.amount, description:formData.description
        }))

        serverWealth[1] += 3;
        console.log('Transaction Accepted by Server 1');
        console.log(JSON.stringify(server1Chain, null, 4));
        ioBrowser.emit('formStatus', 'Transaction Accepted');
        let sobj = {server:1, newblock: server1Chain.chain[server1Chain.chain.length - 1]};
        console.log('Object(Blockchain block) size in bytes: ' + jsonSize(sobj).toString());
        socket.emit('transactionAccepted', {server:1, newblock: server1Chain.chain[server1Chain.chain.length - 1]});
        osocket.emit('transactionAccepted', {server:1, newblock: server1Chain.chain[server1Chain.chain.length - 1]});
    }

}







function passDataToSelectedValidator(selectedValidator) {
    if (selectedValidator != 1) {
        console.log('Object(formData) size in bytes: ' + jsonSize(formData).toString());
        if (selectedValidator === 0) {
            socket.emit('chosenValidator', formData);
        }
        else {
            osocket.emit('chosenValidator', formData);
        }
    }
    else {
        let currentBalance =  balanceOfClient(formData.from);
        requestStatus(currentBalance);



    }
}










function getSum(total, num) {
    return total + num;
}



function selectValidator(aServers) {
    let selectedValidator = getRandomServerPropWealth();

    if (aServers[selectedValidator] === 0){
        let end = false;

        while (!end) {
            selectedValidator = getRandomServerPropWealth();
            if (aServers[selectedValidator] === 1){
                end = true;
                return selectedValidator;
            }
        }
    }

    else {
        return selectedValidator;
    }

}



function generateNatural(distribution, engine) {
    return distribution(engine);
}


function getRandomServerPropWealth() {
    let totalServerWealth = serverWealth.reduce(getSum);
    let i = -1;

    let engine = random.engines.mt19937().autoSeed();
    let distribution = random.integer(1,totalServerWealth);
    let rand = generateNatural(distribution, engine);
    //console.log(rand);

    while (rand>0) {
        i += 1;
        rand = rand - serverWealth[i];

    }

    return i
}

/*
let x = 0
for (let k=0; k<100; k++) {
    x = selectValidator(availableServers)
    console.log(x);
    if (x>2){
        print('error');
    }
}
*/

server.listen(3001, function() {
    console.log("Listening on port 3001");
});