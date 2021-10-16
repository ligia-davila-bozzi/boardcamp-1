import { gameSchema, userSchema } from "./schemas.js";
import express from "express";
import chalk from "chalk";
import dayjs from "dayjs";
import cors from "cors";
import pg from "pg";


const port = 4000;
const app = express();
app.use(express.json());
app.use(cors());

const connectionData = {
    user: 'postgres',
    password: '123456',
    database: 'boardcamp',
    host: 'localhost',
    port: 5432
}

const connection = new pg.Pool(connectionData);

// ================ ROUTES ================ //

// categories:

app.post("/categories", async (req, res) => {
    try {
        const { name } = req.body;
        const isNameAvailable = await connection.query("SELECT * FROM categories WHERE name = $1", [name]);
        if(isNameAvailable.rows.length > 0) return res.sendStatus(409);
        if(name.lenght) return res.sendStatus(400);
        await connection.query("INSERT INTO categories (name) VALUES ($1)", [name]);
        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

app.get("/categories", async (req, res) => {
    try {
        const result = await connection.query(`SELECT * FROM categories`);
        res.send(result.rows);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

// games:

app.post("/games", async (req, res) => {
    try {
        const { name, image, stockTotal, categoryId, pricePerDay } = req.body;
        const isValid = gameSchema.validate(req.body);
        const existentId = await connection.query(`SELECT * FROM categories WHERE id = $1`, [categoryId]);
        if(!existentId.rows.length || isValid.error) return res.sendStatus(400); 
        const alreadyUsed = await connection.query(`SELECT * FROM games WHERE name = $1`, [name]);
        if(alreadyUsed.rows.length) return res.sendStatus(409);
        await connection.query(`INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ($1, $2, $3, $4, $5)`, [name, image, stockTotal, categoryId, pricePerDay]);
        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

app.get("/games", async (req, res) => {
    try {
        const search = req.query.name;
        console.log(search);
        if(search){
            const result = await connection.query(`
            SELECT games.*, categories.name AS "categoryName"
            FROM games
            JOIN categories
            ON games."categoryId" = categories.id
            WHERE games.name ILIKE $1`, [search+'%']);
            res.send(result.rows);
        } else {
            const result = await connection.query(`SELECT games.*, categories.name AS "categoryName" FROM games JOIN categories ON games."categoryId" = categories.id`);
            res.send(result.rows);
        }
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

// clientes:

app.post("/customers", async (req, res) => {
    try {
        const { name, phone, cpf, birthday } = req.body;
        const isValid = userSchema.validate(req.body);
        if (isValid.error) {console.log(isValid.error);return res.sendStatus(400);}
        const existentCpf = await connection.query(`SELECT * FROM customers WHERE cpf = $1`, [cpf]);
        if (existentCpf.rows.length) return res.sendStatus(409);
        await connection.query(`INSERT INTO customers (name, phone, cpf, birthday) VALUES ($1, $2, $3, $4)`, [name, phone, cpf, birthday]);
        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

app.put("/customers/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, cpf, birthday } = req.body;
        const isValid = userSchema.validate(req.body);
        if(isValid.error) return res.sendStatus(400);
        const existentCpf = await connection.query(`SELECT * FROM customers WHERE cpf = $1 AND id != $2`, [cpf, id]);
        if (existentCpf.rows.length) return res.sendStatus(409);
        await connection.query(`UPDATE customers SET name = $1, phone = $2, cpf = $3, birthday = $4`, [name, phone, cpf, birthday]);
        res.sendStatus(200);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

app.get("/customers", async (req, res) => {
    try {
        const search = req.query.cpf;
        console.log(search);
        if(search){
            const result = await connection.query(`SELECT * FROM customers WHERE cpf ILIKE $1`, [search+'%']);
            res.send(result.rows);
        } else {
            const result = await connection.query(`SELECT * FROM customers`);
            res.send(result.rows);
        }
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

app.get("/customers/:id", async (req, res) => {
    try {
        const id = req.params.id;
        console.log(id);
        const existentId = await connection.query(`SELECT * FROM customers WHERE id = $1`, [id]);
        existentId.rows.length ? res.send(existentId.rows[0]) : res.sendStatus(404);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

// rentals:

app.post("/rentals", async (req, res) => {
    try {
        const { customerId, gameId, daysRented } = req.body;
        const existentId = await connection.query(`SELECT * FROM customer WHERE id = $1`, [customerId]);
        const existentGame = await connection.query(`SELECT * FROM games WHERE id = $1`, [gameId]);
        const numOfRentedGames = await connection.query(`SELECT * FROM rentals WHERE "gameId" = $1 AND "returnDate" = $2`, [gameId, null]); 
        if(!existentId.rows.length || !existentGame.rows.length || daysRented <= 0) return res.sendStatus(400);
        if (existentGame.rows[0].stockTotal <= numOfRentedGames) return res.sendStatus(400);
        const originalPrice = existentGame.rows[0].pricePerDay * daysRented;
        const newRental = {
            customerId,
            gameId,
            rentDate: dayjs().format('YYYY-MM-DD'),
            daysRented,
            returnDate: null,
            originalPrice,
            delayFee: null
        }
        await connection.query(`INSERT INTO rentals ("customerId", "gameId", "rentDate", "daysRented", "returnDate", "originalPrice", "delayFee") VALUES ($1, $2, $3, $4, $5, $6)`, [newRental.customerId, newRental.gameId, newRental.rentDate, newRental.daysRented, newRental.returnDate, newRental.originalPrice, newRental.delayFee]);
        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

app.get("/rentals", async (req, res) => {
    try {

    } catch (err) {
        console.log(err);
    }
});

app.post("/rentals/:id/return", async (req, res) => {
    try {

    } catch (err) {
        console.log(err);
    }
});

app.delete("/rentals/:id", async (req, res) => {
    try { 

    } catch (err) {
        console.log(err);
    }
});

// turn server ON:

app.listen(port, () => {
    console.log("Server running on port: "+chalk.blue(port));
});