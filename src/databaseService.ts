import { Queue } from "@arangodb/foxx/queues";
import { Database } from "arangojs";
import { AqlQuery } from "arangojs/aql";
import { DocumentCollection, EdgeCollection } from "arangojs/collection";
import { Dict } from "arangojs/connection";
import { ArrayCursor } from "arangojs/cursor";
import { QueryOptions } from "arangojs/database";
import { DocumentSelector } from "arangojs/documents";
import { Logger } from "./index";
import { DatabaseSettings, MentionRelationship, RetweetRelationship, Tweet, User } from "./interfaces";

/**
 * Database Service provides the connections to the ArangoDB Database
 */
export class DatabaseService{

    ////////////////////////////////////////////////////////////////////////////////////
    /*                                                                                */
    /*                                   VARIBLES                                     */
    /*                                                                                */
    ////////////////////////////////////////////////////////////////////////////////////

    /** Information about the login data to the database */
    private databaseSettings: DatabaseSettings;
    /** Arango DB Database */
    private database: Database;

    // Collections (=Tables)
    private collectionTweets: DocumentCollection;
    private collectionTweetsInvolved: DocumentCollection;
    private collectionUsers: DocumentCollection;
    private collectionUsersInvolved: DocumentCollection;
    private collectionRetweetRelationship: EdgeCollection;
    private collectionRetweetRelationshipInvolved: EdgeCollection;
    private collectionMentionRelationship: EdgeCollection;
    private collectionMentionRelationshipInvolved: EdgeCollection;

    // Queues
    tweetsQueue: Queue;
    tweetsInvolvedQueue: Queue;
    usersQueue: Queue;
    usersInvolvedQueue: Queue;
    RetweetRelationshipQueue: Queue;
    RetweetRelationshipInvolvedQueue: Queue;
    MentionRelationshipInvolvedQueue: Queue;
    MentionRelationshipQueue: Queue;

    ////////////////////////////////////////////////////////////////////////////////////
    /*                                                                                */
    /*                                   CONSTRUCTOR                                  */
    /*                                                                                */
    ////////////////////////////////////////////////////////////////////////////////////

    constructor(databaseSettings: DatabaseSettings, private logger: Logger){
        //Init database
        this.databaseSettings = databaseSettings;
        this.database = new Database(this.databaseSettings);

        //Get Collections
        this.collectionTweets = this.database.collection('tweets');
        this.collectionTweetsInvolved = this.database.collection('tweets-involved');
        this.collectionUsers = this.database.collection('users');
        this.collectionUsersInvolved = this.database.collection('users-involved');
        this.collectionRetweetRelationship = this.database.collection('retweet-relationships');
        this.collectionRetweetRelationshipInvolved = this.database.collection('retweet-relationships-involved');
        this.collectionMentionRelationship = this.database.collection('mention-relationships');
        this.collectionMentionRelationshipInvolved = this.database.collection('mention-relationships-involved');
}

    ////////////////////////////////////////////////////////////////////////////////////
    /*                                                                                */
    /*                                   DATABASE METHODS                             */
    /*                                                                                */
    ////////////////////////////////////////////////////////////////////////////////////

    /**
     * Checks if tweets already exist and otherwise saves them to the database
     * @param tweets 
     */
    public async addTweets(tweets: Tweet[]){
        for(let tweet of tweets){
            await this.addTweet(tweet);
        }
    }

    /**
     * Checks if involved tweets already exist and otherwise saves them to the database
     * @param tweets 
     */
    public async addTweetsInvolved(tweets: Tweet[]){
        for(let tweet of tweets){
            await this.addTweetInvolved(tweet);
        }
    }

    /**
     * Checks if users already exist and otherwise saves them to the database
     * @param tweets 
     */
    public async addUsers(users: User[]){
        for(let user of users){
            await this.addUser(user);
        }
    }

    /**
     * Checks if involved users already exist and otherwise saves them to the database
     * @param tweets 
     */
    public async addUsersInvolved(users: User[]){
        for(let user of users){
            await this.addUserInvolved(user);
        }
    }

    /**
     * Checks if mention relationships already exist and otherwise saves them to the database
     * @param tweets 
     */
    public async addMentionRelationships(mentions: MentionRelationship[]){
        for(let mention of mentions){
            await this.addMentionRelationship(mention);
        }
    }
    
    /**
     * Checks if involved mention relationships already exist and otherwise saves them to the database
     * @param tweets 
     */
    public async addMentionRelationshipsInvolved(mentions: MentionRelationship[]){
        for(let mention of mentions){
            await this.addMentionRelationshipInvolved(mention);
        }
    }

    /**
     * Checks if retweet relationships already exist and otherwise saves them to the database
     * @param tweets 
     */
    public async addRetweetRelationships(retweets: RetweetRelationship[]){
        for(let retweet of retweets){
            await this.addRetweetRelationship(retweet);
        }
    }
    
    /**
     * Checks if involved retweet relationships already exist and otherwise saves them to the database
     * @param tweets 
     */
    public async addRetweetRelationshipsInvolved(retweets: RetweetRelationship[]){
        for(let retweet of retweets){
            await this.addRetweetRelationshipInvolved(retweet);
        }
    }

    /**
     * Checks if tweet already exists
     * @param tweetId
     */
    public async tweetExists(tweetId: string): Promise<boolean>{
        return await this.collectionTweets.documentExists(tweetId);
    }

    /**
     * Checks if involved tweet already exists
     * @param tweetId
     */
    public async tweetInvolvedExists(tweetId: string): Promise<boolean>{
        return await this.collectionTweetsInvolved.documentExists(tweetId);
    }

    /**
     * Checks if user already exists
     * @param userId
     */
    public async userExists(userId: string): Promise<boolean>{
        return await this.collectionUsers.documentExists(userId);
    }

    /**
     * Checks if involved user already exists
     * @param userId
     */
    public async userInvolvedExists(userId: string): Promise<boolean>{
        return await this.collectionUsersInvolved.documentExists(userId);
    }

    /**
     * Gets a single tweet from the database
     * @param tweetId
     */
    public async getTweet(tweetId: string): Promise<Tweet>{
        let exists: boolean = await this.collectionTweets.documentExists(this.collectionTweets.name + '/' + tweetId);

        if(exists){
            return await this.collectionTweets.document(tweetId);
        }
        else return null;
    }

    /**
     * Checks if tweet already exists in collection and otherwise uploads it to the database
     * @param tweet tweet to add
     */
    private async addTweet(tweet: Tweet){
        //Set key
        tweet._key = tweet.id;

        //Check if already exists and upload
        let exists: boolean = await this.collectionTweets.documentExists(tweet._key);

        if(!exists){
            await this.collectionTweets.save(tweet);
            this.logger.addOutput('Tweet ' + tweet._key + ' has been added to the database.', false)
        }
        else{
            this.logger.addOutput('Tweet ' + tweet._key + ' already exists.', false)
        }
    }

    /**
     * Checks if tweet already exists in collection and otherwise uploads it to the database
     * @param tweet tweet to add
     */
    private async addTweetInvolved(tweet: Tweet){
        //Set key
        tweet._key = tweet.id;

        //Check if already exists and upload
        let exists: boolean = await this.collectionTweetsInvolved.documentExists(tweet._key);

        if(!exists){
            await this.collectionTweetsInvolved.save(tweet);
            this.logger.addOutput('Tweet Involved ' + tweet._key + ' has been added to the database.', false)
        }
        else{
            this.logger.addOutput('Tweet Involved ' + tweet._key + ' already exists.', false)
        }
    }

    /**
     * Checks if user already exists in collection and otherwise uploads it to the database
     * @param user user to add
     */
    private async addUser(user: User){
        //Set key
        user._key = user.id;

        //Check if already exists and upload
        let exists: boolean = await this.collectionUsers.documentExists(user._key);

        if(!exists){
            await this.collectionUsers.save(user);
            this.logger.addOutput('User ' + user._key + ' ' + user.username + ' has been added to the database.', false)
        }
        else{
            this.logger.addOutput('User ' + user._key + ' ' + user.username + ' already exists.', false)
        }
    }

    /**
     * Checks if user already exists in collection and updates its content
     * @param user user to update
     */
     public async updateUser(user: User){
        //Check if already exists and upload
        let exists: boolean = await this.collectionUsers.documentExists(user._key);

        if(!exists){
            await this.collectionUsers.save(user);
            this.logger.addOutput('User ' + user._key + ' ' + user.username + ' has been added to the database.', false)
        }
        else
        {
            await this.collectionUsers.replace(user._key, user);
            this.logger.addOutput('User ' + user._key + ' ' + user.username + ' has been updated.', false)
        }
    }

    /**
     * Checks if user already exists in collection and otherwise uploads it to the database
     * @param user user to add
     */
    private async addUserInvolved(user: User){
        //Set key
        user._key = user.id;

        //Check if already exists and upload
        let exists: boolean = await this.collectionUsersInvolved.documentExists(user._key);

        if(!exists){
            await this.collectionUsersInvolved.save(user);
            this.logger.addOutput('User Involved ' + user._key + ' ' + user.username + ' has been added to the database.', false)
        }
        else{
            this.logger.addOutput('User Involved ' + user._key + ' ' + user.username + ' already exists.', false)
        }
    }

    /**
     * Removes user from the users-involved collection
     * @param user user to remove
     */
    public async removeUserInvolved(user: User){
        await this.collectionUsersInvolved.remove(user._key);
        this.logger.addOutput('User Involved ' + user._key + ' ' + user.username + ' has been removed from the database.', false)
    }

    /**
     * Checks if mention relationship already exists in collection and otherwise uploads it to the database
     * @param mentionRelationship mention to add
     */
    private async addMentionRelationship(mentionRelationship: MentionRelationship){
        let exists: boolean = await this.collectionMentionRelationship.documentExists(mentionRelationship._key);

        if(!exists){
            await this.collectionMentionRelationship.save(mentionRelationship);
            this.logger.addOutput('Mention Relationship ' + mentionRelationship._key + ' has been added to the database.', false)
        }
        else{
            this.logger.addOutput('Mention Relationship ' + mentionRelationship._key + ' already exists.', false)
        }
    }

    /**
     * Checks if mention relationship already exists in collection and otherwise uploads it to the database
     * @param mentionRelationship mention to add
     */
    private async addMentionRelationshipInvolved(mentionRelationship: MentionRelationship){
        let exists: boolean = await this.collectionMentionRelationshipInvolved.documentExists(mentionRelationship._key);

        if(!exists){
            await this.collectionMentionRelationshipInvolved.save(mentionRelationship);
            this.logger.addOutput('Mention Relationship Involved ' + mentionRelationship._key + ' has been added to the database.', false)
        }
        else{
            this.logger.addOutput('Mention Relationship Involved ' + mentionRelationship._key + ' already exists.', false)
        }
    }

    /**
     * Checks if retweet relationship already exists in collection and otherwise uploads it to the database
     * @param retweetRelationship retweet to add
     */
    private async addRetweetRelationship(retweetRelationship: RetweetRelationship){
        let exists: boolean = await this.collectionRetweetRelationship.documentExists(retweetRelationship._key);

        if(!exists){
            await this.collectionRetweetRelationship.save(retweetRelationship);
            this.logger.addOutput('Retweet Relationship ' + retweetRelationship._key + ' has been added to the database.', false)
        }
        else{
            this.logger.addOutput('Retweet Relationship ' + retweetRelationship._key + ' already exists.', false)
        }
    }

    /**
     * Checks if retweet relationship already exists in collection and otherwise uploads it to the database
     * @param retweetRelationship retweet to add
     */
    private async addRetweetRelationshipInvolved(retweetRelationship: RetweetRelationship){
        let exists: boolean = await this.collectionRetweetRelationshipInvolved.documentExists(retweetRelationship._key);

        if(!exists){

            await this.collectionRetweetRelationshipInvolved.save(retweetRelationship);
            this.logger.addOutput('Retweet Relationship Involved ' + retweetRelationship._key + ' has been added to the database.', false)
        }
        else{
            this.logger.addOutput('Retweet Relationship Involved ' + retweetRelationship._key + ' already exists.', false)
        }
    }

    /**
     * Gets all Tweets from the collection tweets
     */
    public async getAllTweets(): Promise<Tweet[]>{
        let query: AqlQuery = {
            query: 'FOR c IN tweets RETURN c',
            bindVars: {}
        }
        let cursor: ArrayCursor = await this.database.query(query);
        return await cursor.all();
    }

    public async getTweetsCount(): Promise<number>{
        return (await this.collectionTweets.count()).count;
    }

    /**
     * Makes an AQL request and returns a pointer with the specified offset and count
     * @param offset Start of the pointer
     * @param count Number of documents to be included
     * @returns tweet pointer
     */
    public async getAllTweetsCursor(offset: number, count: number): Promise<ArrayCursor>{
        let query: AqlQuery = {
            query: 'FOR c IN tweets LIMIT '+offset+', '+count+' RETURN c',
            bindVars: {}
        }
        let cursor: ArrayCursor = await this.database.query(query);
        return await cursor;
    }

    public async getAllTweetsInvolved(): Promise<Tweet[]>{
        let query: AqlQuery = {
            query: 'FOR c IN `tweets-involved` RETURN c',
            bindVars: {}
        }
        let cursor: ArrayCursor = await this.database.query(query);
        return await cursor.all();
    }

    /**
     * Gets all Users from the collection users
     */
    public async getAllUsers(): Promise<User[]>{
        let query: AqlQuery = {
            query: 'FOR c IN users RETURN c',
            bindVars: {}
        }
        let cursor: ArrayCursor = await this.database.query(query);
        return await cursor.all();
    }

    /**
     * Gets all involved users from the collection users-involved
     */
    public async getAllUsersInvolved(): Promise<User[]>{
        let query: AqlQuery = {
            query: 'FOR c IN `users-involved` RETURN c',
            bindVars: {}
        }
        let cursor: ArrayCursor = await this.database.query(query);
        return await cursor.all();
    }

    /**
     * Calculates the number of involved neighbours a user has
     * @param user user node for which the neighbour count should be calculated
     * @returns number of involved neighbours
     */
    public async getInvolvedNeighboursCount(user: User): Promise<number> {
        let neighbourCount: number = 0;

        //Get Involved Mention and Retweet Relationship edges
        let queryMention: AqlQuery = {
            query: "FOR e IN `mention-relationships-involved` FILTER e._from == 'users-involved/"+user._key+"' || e._to == 'users-involved/"+user._key+"' RETURN e",
            bindVars: {}
        }

        let cursorMention: ArrayCursor = await this.database.query(queryMention);

        let queryRetweet: AqlQuery = {
            query: "FOR e IN `retweet-relationships-involved` FILTER e._from == 'users-involved/"+user._key+"' || e._to == 'users-involved/"+user._key+"' RETURN e",
            bindVars: {}
        }
        let cursorRetweet: ArrayCursor = await this.database.query(queryRetweet);

        //Count the neighbours
        neighbourCount += await (await cursorMention.all()).length;
        neighbourCount += await (await cursorRetweet.all()).length;

        return neighbourCount
    }

}