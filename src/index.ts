////////////////////////////////////////////////////////////////////////////////////
/*                                                                                */
/*                                   IMPORTS                                      */
/*                                                                                */
////////////////////////////////////////////////////////////////////////////////////

//Interfaces
import { Config, MentionRelationship, RetweetRelationship, Tweet, User } from './interfaces';
import express from 'express';
import { TwitterService } from './twitterService';
/** Config for initial setup */
import { DefaultConfiguration } from './config';
import { DatabaseService } from './databaseService';
import { ArrayCursor } from 'arangojs/cursor';
const defaultConfiguration: any = new DefaultConfiguration();

////////////////////////////////////////////////////////////////////////////////////
/*                                                                                */
/*                                   LOGGER                                       */
/*                                                                                */
////////////////////////////////////////////////////////////////////////////////////

export class Logger{
    /** Logging steps of the script */
    public step: number = 0;

    /**
     * Set messages output
     * @param messages Array of messages to put out
     */
    public setOutput(messages: string[]){
        app.locals.messages = messages;
        if(config.detailedConsoleLogs){
            messages.forEach(message => {
                console.log(message);
            });
        }
    }

    /**
     * Add a message to output
     * @param message Message to add to output
     */
    public addOutput(message: string, important: boolean){
        if(important){
            app.locals.messages.push(message);
            console.log('Step '+ this.step + ': ' + message);
        }
        else{
            if(config.detailedConsoleLogs) console.log('Step '+ this.step + ': ' + message);
        }
    }
}

////////////////////////////////////////////////////////////////////////////////////
/*                                                                                */
/*                                   VARIBLES                                     */
/*                                                                                */
////////////////////////////////////////////////////////////////////////////////////

/** Set up webserver */
const app = express();
/** Configurations */
let config: Config = defaultConfiguration;

let accountsArray: string[] = [];
/** Hashtags Arrays */
let hashtagsArray: string[] = [];
/** Twitter Service provides connection to the Twitter API */
let twitterService: TwitterService;
/** Database Service provides connection to ArangoDB */
let databaseService: DatabaseService;
/** Logger logs output to console and web */
let logger: Logger = new Logger();

////////////////////////////////////////////////////////////////////////////////////
/*                                                                                */
/*                                   WEBSERVER                                    */
/*                                                                                */
////////////////////////////////////////////////////////////////////////////////////

// Set configuration variable
app.locals.config = config;
app.locals.messages = [];

// Start GUI
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false })) //Otherwise the body of submits is undefined
app.get('/', async (request: any, response: any) => {
    response.render('index.ejs');
});
app.listen(process.env.PORT || 3000, () => {
    console.log('Please go to http://localhost:3000 to set the configuration and start the script.')
});

/**
 * Executes when the start button is being clicked
 */
app.post('/start', function(req, res){
    //updated config
    if(req.body.checkboxStep1 == 'on'){
        config.steps.step1 = true;
    }
    else{
        config.steps.step1 = false;
    }
    if(req.body.checkboxStep2 == 'on'){
        config.steps.step2 = true;
    }
    else{
        config.steps.step2 = false;
    }
    if(req.body.checkboxStep3 == 'on'){
        config.steps.step3 = true;
    }
    else{
        config.steps.step3 = false;
    }
    if(req.body.checkboxStep4 == 'on'){
        config.steps.step4 = true;
    }
    else{
        config.steps.step4 = false;
    }
    config.twitterAPI.bearer = req.body.textBearerToken;
    config.twitterAPI.userAgent = req.body.textUserAgent;
    config.database.url = req.body.textDatabaseUrl;
    config.database.databaseName = req.body.textDatabaseName;
    config.database.auth.username = req.body.textDatabaseUsername;
    config.database.auth.password = req.body.textDatabasePassword;
    config.keywords.accounts = req.body.textAccounts;
    config.keywords.hashtags = req.body.textHashtags;
    config.keywords.dateFrom = new Date(req.body.dateFrom);
    config.keywords.dateTo = new Date(req.body.dateTo);

    //Check for empty fields
    let errorMessage: string = '';
    if(!config.twitterAPI.bearer || config.twitterAPI.bearer == '') errorMessage = 'ERROR: Please enter a Bearer Token.';
    if(!config.twitterAPI.userAgent || config.twitterAPI.userAgent == '') errorMessage = 'ERROR: Please enter a User Agent.';
    if(!config.database.url || config.database.url == '') errorMessage = 'ERROR: Please enter a Database Url.';
    if(!config.database.databaseName || config.database.databaseName == '') errorMessage = 'ERROR: Please enter a Database Name.';
    if(!config.database.auth.username || config.database.auth.username == '') errorMessage = 'ERROR: Please enter a Database Username.';
    if(!config.database.auth.password || config.database.auth.password == '') errorMessage = 'ERROR: Please enter a Database Password.';
    if(!config.keywords.accounts || config.keywords.accounts == '') errorMessage = 'ERROR: Please enter Accounts.';
    if(!config.keywords.hashtags || config.keywords.hashtags == '') errorMessage = 'ERROR: Please enter Hashtags.';
    if(!config.keywords.dateFrom) errorMessage = 'ERROR: Please enter a date from which to collect the data.';
    if(!config.keywords.dateTo) errorMessage = 'ERROR: Please enter a date until which to collect the data.';
    if(config.keywords.dateFrom && config.keywords.dateTo && config.keywords.dateFrom >= config.keywords.dateTo) errorMessage = 'ERROR: DateFrom must be earlier than dateTo.';

    //Parse Arrays
    let tmpWord: string = '';
    let accountsCopy: string = config.keywords.accounts;
    let hashtagsCopy: string = config.keywords.hashtags;
    accountsArray = [];
    hashtagsArray = [];
    while(accountsCopy.length > 0){
        if(accountsCopy[0] == ','){
            //Save tmp word to accountsArray
            if(tmpWord != ''){
                accountsArray.push(tmpWord); 
                tmpWord = '';
            }
        }
        else{
            if(accountsCopy[0] != ' '){
                //Add letter to tmpWord
                tmpWord += accountsCopy[0];
            }
        }
        //Remove current letter from array
        accountsCopy = accountsCopy.substring(1);
    }
    if(tmpWord != ''){
        accountsArray.push(tmpWord); 
        tmpWord = '';
    }

    while(hashtagsCopy.length > 0){
        if(hashtagsCopy[0] == ','){
            //Save tmp word to accountsArray
            if(tmpWord != ''){
                hashtagsArray.push(tmpWord); 
                tmpWord = '';
            }
        }
        else{
            if(hashtagsCopy[0] != ' '){
                //Add letter to tmpWord
                tmpWord += hashtagsCopy[0];
            }
        }
        //Remove current letter from array
        hashtagsCopy = hashtagsCopy.substring(1);
    }
    if(tmpWord != ''){
        hashtagsArray.push(tmpWord); 
        tmpWord = '';
    }

    if(accountsArray.length == 0) errorMessage = 'ERROR: Please enter Accounts correctly.';
    if(hashtagsArray.length == 0) errorMessage = 'ERROR: Please enter Hashtags correctly.';

    //refresh web
    res.redirect('/');
    app.locals.config = config;

    //throw error or start the script
    if(errorMessage != ''){
        logger.setOutput([errorMessage]);
    } 
    else{
        logger.setOutput([]);
        logger.addOutput('+++ Starting the script with the following variables: +++', true);
        logger.addOutput('Bearer Token: ' + config.twitterAPI.bearer, true);
        logger.addOutput('UserAgent: ' + config.twitterAPI.userAgent, true);
        logger.addOutput('Accounts: ' + accountsArray, true);
        logger.addOutput('Hashtags: ' + hashtagsArray, true);
        logger.addOutput('DateFrom: ' + config.keywords.dateFrom, true);
        logger.addOutput('DateTo: ' + config.keywords.dateTo, true);
        logger.addOutput('+++++++++++++++++++++++++++++++++++++++++', true);
        
        twitterService = new TwitterService(config.twitterAPI, config.userFields, config.tweetFields, logger);
        databaseService = new DatabaseService(config.database, logger);
        
        runScript();
    }
});

////////////////////////////////////////////////////////////////////////////////////
/*                                                                                */
/*                                RUN SCRIPT                                      */
/*                                                                                */
////////////////////////////////////////////////////////////////////////////////////

/**
 * Runs the script which consists of three steps:
 *   1) Retrieving users and followers from the TwitterAPI
 *   2) Retrieving Tweet Timelines and Tweet analysis for involved users
 *   3) Edge Analysis for @ and RT@ relationships
 */
async function runScript() {

    //Variables for status bar
    let finishedObjects: number = 0;
    let currentStatus: number = 0;
    let oldStatus: number = 0;

    let users: User[] = [];

    ////////////////////////////////////////////////////////////////////////////////////
    /*                                       STEP 1                                   */
    ////////////////////////////////////////////////////////////////////////////////////
    logger.step = 1;
    logger.addOutput('Starting with step 1: Retrieving Users and Followers', true);
    if(config.steps.step1){

        //getting seed users of the set accounts
        logger.addOutput('Trying to retrieve all configured accounts.', true);
        let configuredUsers: User[] = await twitterService.getUsersByUsername(accountsArray);
        if(!configuredUsers || configuredUsers.length  == 0) {
            logger.addOutput('ERROR: Could not retrieve Users (getUsersByUsername). This could be due to a misspelled username.', true);
            return;
        }
        else logger.addOutput('SUCCESS: Retrieved all configured accounts.', true);
        
        //Get Followers
        logger.addOutput('Trying to retrieve all followers of the configured accounts.', true);
        users = users.concat(configuredUsers);
        await databaseService.addUsers(configuredUsers);

        // For all configured users add all followers to the users array
        for(let user of configuredUsers){
            let tmpArray: User[] = await twitterService.getFollowers(user.id);
            users = users.concat(tmpArray);
            logger.addOutput('Found ' + tmpArray.length + ' followers of the user ' + user.username + '.', true);

            //Save followers to database
            logger.addOutput('Trying to add all followers of the user ' + user.username + ' to the database.', true);
            await databaseService.addUsers(tmpArray);
        }
        logger.addOutput('SUCCESS: Retrieving all followers accounts. Total of ' + users.length + ' users.', true);

    }
    else{
        users = await databaseService.getAllUsers();
        logger.addOutput('SUCCESS: Fetched ' + users.length + ' documents from users collection', true);
    }

    ////////////////////////////////////////////////////////////////////////////////////
    /*                                       STEP 2                                   */
    ////////////////////////////////////////////////////////////////////////////////////
    logger.step = 2;

    //Get and analyse Tweets for involved users
    let tweets: Tweet[] = [];
    let tweetsInvolved: Tweet[] = [];
    let usersInvolved: User[] = [];

    logger.addOutput('Starting with step 2: Retrieving Tweet Timelines and Tweet analysis for involved users', true);
    if(config.steps.step2){
        
        let finishedTweets: number = 0;
        let currentStatus: number = 0;
        let oldStatus: number = 0;

        for(let user of users){
            //print current status in %
            currentStatus = Math.round((finishedObjects / users.length) * 100)
            if(currentStatus > oldStatus){
                oldStatus = currentStatus;
                logger.addOutput(currentStatus + '% done', true);
            }
            finishedObjects ++;

            if(!user.step2Performed){
                //Get all tweets of the user
                let tmpTweets: Tweet[] = await twitterService.getTimeline(user.id, config.keywords.dateFrom, config.keywords.dateTo);

                tweets = tweets.concat(tmpTweets);
                logger.addOutput('Found ' + tmpTweets.length + ' tweets of the user ' + user.username + '.', false);

                //Add all tweets to the database
                await databaseService.addTweets(tmpTweets);
                logger.addOutput('SUCCESS: Added all tweets of ' + user.username + ' to the database.', false);

                //Analyse tweets
                let isInvolved: boolean = false;
                for(let tweet of tmpTweets){
                    //Analyse for hashtags and therefore whether the user and the tweet is involved
                    if(tweet.entities && tweet.entities.hashtags){
                        let hashtags: any[] = tweet.entities.hashtags;
                        for(let hashtag of hashtags){
                            let hashtagText: string = hashtag.tag;
                            for(let configHashtagText of hashtagsArray){
                                if(hashtagText == configHashtagText || hashtagText == configHashtagText.toLowerCase() || hashtagText == configHashtagText.toUpperCase()){
                                    isInvolved = true;
                                    tweetsInvolved.push(tweet);
                                    await databaseService.addTweetsInvolved([tweet]);
                                    logger.addOutput('SUCCESS: Added involved tweet of ' + user.username + ' to the database because of the hashtag ' + hashtagText + '.', false);
                                }
                            }
                        }
                    }
                }

                if(isInvolved){
                    usersInvolved.push(user);
                    await databaseService.addUsersInvolved([user]);
                    logger.addOutput('SUCCESS: Added involved user ' + user.username + ' to the database.', false);
                }

                // mark step2 performes
                user.step2Performed = true;
                await databaseService.updateUser(user);
            }
            else{
                logger.addOutput('Step 2 has already been performed for user ' + user.username + '.', false);
            }
            

            
        }

    }
    else{
        tweetsInvolved = await databaseService.getAllTweetsInvolved();
        usersInvolved = await databaseService.getAllUsersInvolved();
        logger.addOutput('SUCCESS: Fetched ' + usersInvolved.length + ' documents from users-involved collection', true);
        logger.addOutput('SUCCESS: Fetched ' + tweetsInvolved.length + ' documents from tweets-involved collection', true);
    }

    //reset status
    finishedObjects = 0;
    currentStatus = 0;
    oldStatus = 0;

    ////////////////////////////////////////////////////////////////////////////////////
    /*                                       STEP 3                                   */
    ////////////////////////////////////////////////////////////////////////////////////
    logger.step = 3;
    logger.addOutput('Starting with step 3: Edge Analysis for @ and RT@ realtionships', true);
    if(config.steps.step3){

        //Get TweetsCount
        let tweetsCount: number = await databaseService.getTweetsCount();
        let localCount: number = 0;
        logger.addOutput('SUCCESS: There is a total of ' + tweetsCount + ' documents in the tweets collection', true);

        while(localCount < tweetsCount){
            let tweetsCursor: ArrayCursor = await databaseService.getAllTweetsCursor(localCount, 10000);
            logger.addOutput('Starting analysis from tweet number ' + localCount, true);

            //Analyse tweets for edges
            while(tweetsCursor.hasNext){
                try{
                    let tweet: Tweet = await tweetsCursor.next();
                    localCount ++;

                    //print current status in %
                    currentStatus = Math.round((finishedObjects / tweetsCount) * 100)
                    if(currentStatus > oldStatus){
                        oldStatus = currentStatus;
                        logger.addOutput(currentStatus + '% done', true);
                    }
                    finishedObjects ++;

                    //Mentions
                    if(tweet.entities && tweet.entities.mentions){
                        let mentions: any[] = tweet.entities.mentions;
                        for(let mention of mentions){
                            let usersInvolved: boolean = false;
                            if(await databaseService.userInvolvedExists(mention.id) && await databaseService.userInvolvedExists(tweet.author_id)){
                                usersInvolved = true;

                                //Add Involved Mention Relationship
                                let mentionRelationship: MentionRelationship = new MentionRelationship;
                                mentionRelationship._from = 'users-involved/' + tweet.author_id;
                                mentionRelationship._to = 'users-involved/' + mention.id;
                                mentionRelationship._key = 'ME' + tweet.author_id + '-' + mention.id;
                                mentionRelationship.tweetId = tweet.id;
                                mentionRelationship.userId = mention.id;
                                mentionRelationship.username = mention.username;

                                databaseService.addMentionRelationshipsInvolved([mentionRelationship]);
                                logger.addOutput('SUCCESS: Added involved mention relationship from ' + tweet.id + ' to ' + mention.id + ' to the database.', false);
                            }
                            if(usersInvolved || await databaseService.userExists(mention.id)){
                                //Add Mention Relationship
                                let mentionRelationship: MentionRelationship = new MentionRelationship;
                                mentionRelationship._from = 'users/' + tweet.author_id;
                                mentionRelationship._to = 'users/' + mention.id;
                                mentionRelationship._key = 'ME' + tweet.author_id + '-' + mention.id;
                                mentionRelationship.tweetId = tweet.id;
                                mentionRelationship.userId = mention.id;
                                mentionRelationship.username = mention.username;

                                databaseService.addMentionRelationships([mentionRelationship]);
                                logger.addOutput('SUCCESS: Added mention relationship from ' + tweet.author_id + ' to ' + mention.id + ' to the database.', false);
                            }
                        }
                    }

                    //Retweets
                    if(tweet && tweet.referenced_tweets){
                        let retweets: any[] = tweet.referenced_tweets;
                        for(let retweet of retweets){
                            let retweetedTweet: Tweet = await databaseService.getTweet(retweet.id);
                            let usersInvolved: boolean = false;

                            if(retweetedTweet){

                                if(await databaseService.userInvolvedExists(retweetedTweet.author_id) && await databaseService.userInvolvedExists(tweet.author_id)){
                                    usersInvolved = true;

                                    //Add Involved Retweet Relationship
                                    let retweetRelationship: RetweetRelationship = new RetweetRelationship;
                                    retweetRelationship._from = 'users-involved/' + tweet.author_id;
                                    retweetRelationship._to = 'users-involved/' + retweetedTweet.author_id;
                                    retweetRelationship._key = 'RE' + tweet.author_id + '-' + retweetedTweet.author_id;
                                    retweetRelationship.tweetId = tweet.id;
                                    retweetRelationship.retweetedTweetId = retweetedTweet.id;

                                    databaseService.addRetweetRelationshipsInvolved([retweetRelationship]);
                                    logger.addOutput('SUCCESS: Added involved retweet relationship from ' + tweet.author_id + ' to ' + retweetedTweet.author_id + ' to the database.', false);
                                    
                                }
                                if(usersInvolved || await databaseService.userExists(retweetedTweet.author_id)){
                                    //Add Retweet Relationship
                                    let retweetRelationship: RetweetRelationship = new RetweetRelationship;
                                    retweetRelationship._from = 'users/' + tweet.author_id;
                                    retweetRelationship._to = 'users/' + retweetedTweet.author_id;
                                    retweetRelationship._key = 'RE' + tweet.author_id + '-' + retweetedTweet.author_id;
                                    retweetRelationship.tweetId = tweet.id;
                                    retweetRelationship.retweetedTweetId = retweetedTweet.id;

                                    databaseService.addRetweetRelationships([retweetRelationship]);
                                    logger.addOutput('SUCCESS: Added retweet relationship from ' + tweet.author_id + ' to ' + retweetedTweet.author_id + ' to the database.', false);
                                }
                            }
                        }
                    }
                }
                catch(e: any){
                    logger.addOutput('Error at localCount '+localCount, true);
                    localCount++;
                    finishedObjects++;
                }
            }
        }
        
    
    }

    //reset status
    finishedObjects = 0;
    currentStatus = 0;
    oldStatus = 0;

    ////////////////////////////////////////////////////////////////////////////////////
    /*                                       STEP 4                                   */
    ////////////////////////////////////////////////////////////////////////////////////
    logger.step = 4;
    logger.addOutput('Starting with step 4: Deleting involved users without edges', true);
    if(config.steps.step4){
        if(usersInvolved.length == 0){
            usersInvolved = await databaseService.getAllUsersInvolved();
        }

        for(let i: number = 0; i < usersInvolved.length; i++){
            let user: User = usersInvolved[i];
            //print current status in %
            currentStatus = Math.round((finishedObjects / usersInvolved.length) * 100)
            if(currentStatus > oldStatus){
                oldStatus = currentStatus;
                logger.addOutput(currentStatus + '% done', true);
            }
            finishedObjects ++;
            let neighboursCount: number = await databaseService.getInvolvedNeighboursCount(user);
            if(neighboursCount == 0){
                databaseService.removeUserInvolved(user);
            }
        }
        
    }

    logger.addOutput('DONE', true);
};