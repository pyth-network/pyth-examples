import express,{Application} from "express";
import rateLimit from 'express-rate-limit';
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import getADAPriceRoute from "../routes/getADAPriceFromPyth";
import getADAPriceRangeRoute from "../routes/getADAPriceRangeFromPyth";
import getADAPriceHistoryRoute from "../routes/getADAPriceHistoryFromPyth";

class Server{
 private app: Application;
 private port: number;
     
    private apiPath = {
       
        getADAPricePath: '/api/get-adaprice',
        getADAPriceRangePath: '/api/get-adaprice-range',
        getADAPriceHistoryPath: '/api/get-adaprice-history',

    }

    constructor(){
        this.app = express();
        this.port = Number(process.env.PORT) || 3001;
        this.middlewares();
        this.routes();   
    }

    middlewares(){
       
        this.app.use(cors());
        this.app.use(express.json({ limit: '25mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '25mb' }));
        
    }

    routes(){
      
        this.app.use(this.apiPath.getADAPricePath, getADAPriceRoute);
        this.app.use(this.apiPath.getADAPriceRangePath, getADAPriceRangeRoute);
        this.app.use(this.apiPath.getADAPriceHistoryPath, getADAPriceHistoryRoute);
       

    }

    listen(){
        this.app.listen(this.port, '127.0.0.1', () => {
            console.log('🚀 Server Pyth Hackaton runing http://127.0.0.1:' + this.port + ' version 1.0.0');
           
        });   
    }
}

export default Server;