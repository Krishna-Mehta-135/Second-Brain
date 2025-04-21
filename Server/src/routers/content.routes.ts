import express from "express";

const contentRouter = express.Router();

contentRouter.get("/", );  //get all content
contentRouter.post("/create", );   //create new content
contentRouter.delete("/", );    //delete a content

export {contentRouter}