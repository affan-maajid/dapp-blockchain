# dapp-blockchain

#### A decentralized app which uses blockchain to record every transaction made by users. 

In this project, 3 servers were created using Node.js environment to serve the app and maintain an updated version of the blockchain. The app keeps running as long as atleast 1 of the servers is functioning. Each server maintains an updated version of the blockchain. If any server goes offline, it is sent a copy of the updated blockchain by one of the other online servers as soon as it is up again.

The chances of a server being chosen to add a new block to the chain are proportional to the number of blocks it has added to the blockchain in the past. The more blocks a server adds to the blockchain, the more wealth (points/coins) it gathers and the higher its chances of being chosen to add another block to the blockchain in the future.

#### Frameworks & Libraries Used:
* Express.js
* Socket.IO
* crypto-js
* random-js
