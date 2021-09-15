import { Tweet, TweetFields, TwitterAPISettings, User, UserFields } from "./interfaces";
import got from 'got';
import { Logger } from "./index";

/** HTTPS Client */
const needle = require('needle');

/**
 * Twitter Service provides the connections to the TwitterAPI
 */
export class TwitterService{

    ////////////////////////////////////////////////////////////////////////////////////
    /*                                                                                */
    /*                                   VARIBLES                                     */
    /*                                                                                */
    ////////////////////////////////////////////////////////////////////////////////////

    /** TwitterAPI OAuth Bearer Token */
    private bearer: string;
    /** User-Agent / Platform */
    private userAgent: string = 'WebOCD';
    /** TwitterAPI V2 URL */
    private url: string = 'https://api.twitter.com/2/';

    /** Indicates the user fields which will be retrieved from the TwitterAPI */
    private paramsUser: string = ''
    /** Indicates the tweet fields which will be retrieved from the TwitterAPI */
    private paramsTweet: string = ''

    //Rate limits Archive Search
    private xRateLimitLimitArchiveSearch: number = 300;
    private xRateLimitRemainingArchiveSearch: number = 300;
    private xRateLimitResetArchiveSearch: number = 0;
    private lastCallArchiveSearch: number = 0;

    //Rate limits Follower Lookup
    private xRateLimitLimitFollower: number = 15;
    private xRateLimitRemainingFollower: number = 15;
    private xRateLimitResetFollower: number = 0;
    private lastCallFollower: number = 0;

    //Rate limits Timeline
    private xRateLimitLimitTimeline: number = 15;
    private xRateLimitRemainingTimeline: number = 15;
    private xRateLimitResetTimeline: number = 0;
    private lastCallTimeline: number = 0;

    ////////////////////////////////////////////////////////////////////////////////////
    /*                                                                                */
    /*                                   CONSTRUCTOR                                  */
    /*                                                                                */
    ////////////////////////////////////////////////////////////////////////////////////

    constructor(twitterAPISettings: TwitterAPISettings, userFields: UserFields, tweetFields: TweetFields, private logger: Logger){
        this.bearer = twitterAPISettings.bearer;
        this.userAgent = twitterAPISettings.userAgent;

        this.xRateLimitResetArchiveSearch = this.getUTCSecondsNow();
        this.lastCallArchiveSearch = this.getUTCSecondsNow();
        this.xRateLimitResetFollower = this.getUTCSecondsNow();
        this.lastCallFollower = this.getUTCSecondsNow();

        //set up user fields
        if(userFields.created_at) this.paramsUser += 'created_at,';
        if(userFields.description) this.paramsUser += 'description,';
        if(userFields.entities) this.paramsUser += 'entities,';
        if(userFields.location) this.paramsUser += 'location,';
        if(userFields.pinned_tweet_id) this.paramsUser += 'pinned_tweet_id,';
        if(userFields.profile_image_url) this.paramsUser += 'profile_image_url,';
        if(userFields.protected) this.paramsUser += 'protected,';
        if(userFields.public_metrics) this.paramsUser += 'public_metrics,';
        if(userFields.url) this.paramsUser += 'url,';
        if(userFields.verified) this.paramsUser += 'verified,';
        if(userFields.withheld) this.paramsUser += 'withheld,';
        this.paramsUser = this.paramsUser.replace(/,\s*$/, ""); //removes last ,

        //set up tweet fields
        if(tweetFields.attachments) this.paramsTweet += 'attachments,';
        if(tweetFields.author_id) this.paramsTweet += 'author_id,';
        if(tweetFields.context_annotations) this.paramsTweet += 'context_annotations,';
        if(tweetFields.conversation_id) this.paramsTweet += 'conversation_id,';
        if(tweetFields.created_at) this.paramsTweet += 'created_at,';
        if(tweetFields.entities) this.paramsTweet += 'entities,';
        if(tweetFields.geo) this.paramsTweet += 'geo,';
        if(tweetFields.in_reply_to_user_id) this.paramsTweet += 'in_reply_to_user_id,';
        if(tweetFields.lang) this.paramsTweet += 'lang,';
        if(tweetFields.non_public_metrics) this.paramsTweet += 'non_public_metrics,';
        if(tweetFields.organic_metrics) this.paramsTweet += 'organic_metrics,';
        if(tweetFields.possibly_sensitive) this.paramsTweet += 'possibly_sensitive,';
        if(tweetFields.promoted_metrics) this.paramsTweet += 'promoted_metrics,';
        if(tweetFields.public_metrics) this.paramsTweet += 'public_metrics,';
        if(tweetFields.referenced_tweets) this.paramsTweet += 'referenced_tweets,';
        if(tweetFields.reply_settings) this.paramsTweet += 'reply_settings,';
        if(tweetFields.source) this.paramsTweet += 'source,';
        if(tweetFields.withheld) this.paramsTweet += 'withheld,';
        this.paramsTweet = this.paramsTweet.replace(/,\s*$/, ""); //removes last ,
    }

    ////////////////////////////////////////////////////////////////////////////////////
    /*                                                                                */
    /*                                   API METHODS                                  */
    /*                                                                                */
    ////////////////////////////////////////////////////////////////////////////////////

    /**
     * Provides http options object
     * @returns http options
     */
    private getOptions(): object{
        return {
            headers:{
                'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Authorization': 'Bearer '+ this.bearer,
                'User-Agent': this.userAgent,
            }
            
        }
    }

    /**
     * Get users from the Twitter API
     * WARNING: This methode does not consider the rate limits of the Twitter API because it can be called 900 times every 15 min 
     * and is only called once when the script is started
     * @param usernames Array of usernames
     * @returns Array of users
     */
    public async getUsersByUsername(usernames: string[]): Promise<User[]>{
        try{
            let reqURL: string = this.url + 'users/by';

            let params = {
                'usernames': usernames.toString(),
                'user.fields': this.paramsUser,
            }

            const req = await needle('get', reqURL, params, this.getOptions());
            if (req.body) {
                return req.body.data;
            }
            if (req.statusCode != 200) {
                this.logger.addOutput('ERROR: Status Code:' + req.statusCode+ ' Message ' +req.statusMessage, true);
                return [];
            }
        }
        catch(e){
            this.logger.addOutput('ERROR: Encountered an error while trying to get users (getUsersByUsername)', true);
            return [];
        }
    }

    /**
     * Get followers of a user from the Twitter API
     * @param userId userIds
     * @returns Array of users
     */
    public async getFollowers(userId: string): Promise<User[]> {
        let followers: User[] = [];
        let hasNextPage: boolean = true;
        let nextToken: string = null;
        while(hasNextPage){
            let resp: any = await this.getFollowerPage('1000', userId, nextToken);
            if (resp && resp.meta && resp.meta.result_count && resp.meta.result_count > 0) {
                if (resp.data) {
                    followers.push.apply(followers, resp.data);
                }
                if (resp.meta.next_token) {
                    nextToken = resp.meta.next_token;
                } else {
                    hasNextPage = false;
                }
            } else {
                hasNextPage = false;
            }
        }
        return followers;
    }

    /**
     * Gets a single page of followers from the TwitterAPI
     * @param max_results 10 < max_results < 1000
     * @param userId 
     * @param nextToken token for the next page
     * @returns 
     */
    private async getFollowerPage(max_results: string, userId: string, nextToken?: string): Promise<object> {
        try {
            let reqURL: string = this.url + 'users/'+ userId +'/followers';
            let params = {};

            if(nextToken){
                params = {
                    'user.fields': this.paramsUser,
                    'max_results': max_results,
                    'pagination_token': nextToken
                }
            }
            else{
                params = {
                    'user.fields': this.paramsUser,
                    'max_results': max_results
                }
            }

            await this.requestFollower()
            const req = await needle('get', reqURL, params, this.getOptions());

            if(req.headers){
                this.updateLimitsFollower(req.headers['x-rate-limit-limit'],req.headers['x-rate-limit-remaining'], req.headers['x-rate-limit-reset']);
            }
            if (req.statusCode != 200) {
                this.logger.addOutput('ERROR: Status Code:' + req.statusCode+ ' Message ' +req.statusMessage, true);
                return null;
            }
            return req.body;
        } catch (err) {
            this.logger.addOutput('ERROR: Encountered an error while trying to get data (getFollowerPage)', true);
            return null;
        }
    }

    /**
     * Get all tweets of a user from the Twitter API
     * @param userId userId
     * @returns Array of tweets
     */
     public async getTimeline(userId: string, dateFrom: Date, dateTo: Date): Promise<Tweet[]> {
        let timeline: Tweet[] = [];
        let hasNextPage: boolean = true;
        let nextToken: string = null;
        while(hasNextPage){
            let resp: any = await this.getTimelinePage('100', userId, dateFrom.toISOString(), dateTo.toISOString(), nextToken);
            if (resp && resp.meta && resp.meta.result_count && resp.meta.result_count > 0) {
                if (resp.data) {
                    timeline.push.apply(timeline, resp.data);
                }
                if (resp.meta.next_token) {
                    nextToken = resp.meta.next_token;
                } else {
                    hasNextPage = false;
                }
            } else {
                hasNextPage = false;
            }
        }
        return timeline;
    }

    /**
     * Gets a single page of timeline tweets from the TwitterAPI
     * @param max_results 5 < max_results < 100
     * @param userId 
     * @param nextToken token for the next page
     * @returns 
     */
    private async getTimelinePage(max_results: string, userId: string, dateFrom: string, dateTo: string, nextToken?: string): Promise<object> {
        try {
            let reqURL: string = this.url + 'users/'+ userId +'/tweets';
            let params = {};

            if(nextToken){
                params = {
                    'tweet.fields': this.paramsTweet,
                    'max_results': max_results,
                    'start_time': dateFrom,
                    'end_time': dateTo,
                    'pagination_token': nextToken
                }
            }
            else{
                params = {
                    'tweet.fields': this.paramsTweet,
                    'max_results': max_results,
                    'start_time': dateFrom,
                    'end_time': dateTo
                }
            }

            await this.requestTimeline()
            const req = await needle('get', reqURL, params, this.getOptions());

            if(req.headers){
                this.updateLimitsTimeline(req.headers['x-rate-limit-limit'],req.headers['x-rate-limit-remaining'], req.headers['x-rate-limit-reset']);
            }
            if (req.statusCode != 200) {
                this.logger.addOutput('ERROR: Status Code:' + req.statusCode+ ' Message ' +req.statusMessage, true);
                return null;
            }
            return req.body;
        } catch (err) {
            this.logger.addOutput('ERROR: Encountered an error while trying to get data (getTimeline)', true);
            return null;
        }
    }

    /**
     * Get followers from the Twitter API
     * @param fromUser userId or username
     * @param dateFrom
     * @param dateTo
     * @returns Array of users
     */
     public async fullArchiveSearch(fromUser: string, dateFrom: Date, dateTo: Date, hashtags: string[]): Promise<Tweet[]> {
        let tweets: Tweet[] = [];
        let hasNextPage: boolean = true;
        let nextToken: string = null;
        while(hasNextPage){
            let resp: any = await this.getArchiveSearchPage('100', fromUser, dateFrom.toISOString(), dateTo.toISOString(), hashtags, nextToken);
            if (resp && resp.meta && resp.meta.result_count && resp.meta.result_count > 0) {
                if (resp.data) {
                    tweets.push.apply(tweets, resp.data);
                }
                if (resp.meta.next_token) {
                    nextToken = resp.meta.next_token;
                } else {
                    hasNextPage = false;
                }
            } else {
                hasNextPage = false;
            }
        }
        return tweets;
    }

    /**
     * Gets a single page of followers from the TwitterAPI
     * @param max_results 10 < max_results < 100
     * @param userId 
     * @param dateFrom
     * @param dateTo
     * @param nextToken token for the next page
     * @returns 
     */
    private async getArchiveSearchPage(max_results: string, fromUser: string, dateFrom: string, dateTo: string, hashtags: string[], nextToken?: string): Promise<object> {
        try {
            let reqURL: string = this.url + 'tweets/search/all';
            let params = {};

            let hashtagsString: string = ''
            hashtags.forEach(hashtag => {
                if(hashtagsString == '') hashtagsString += '#' + hashtag;
                else hashtagsString += ' OR #' + hashtag;
            });


            if(nextToken){
                params = {
                    'query': 'from:' + fromUser + ' (' + hashtagsString + ')', //-is:retweet',
                    'tweet.fields': this.paramsTweet,
                    'start_time': dateFrom,
                    'end_time': dateTo,
                    'max_results': max_results,
                    'next_token': nextToken
                }
            }
            else{
                params = {
                    'query': 'from:' + fromUser + ' (' + hashtagsString + ')', //-is:retweet',
                    'tweet.fields': this.paramsTweet,
                    'start_time': dateFrom,
                    'end_time': dateTo,
                    'max_results': max_results,
                }
            }

            await this.requestArchiveSearch()
            const req = await needle('get', reqURL, params, this.getOptions());

            if(req.headers){
                this.updateLimitsArchiveSearch(req.headers['x-rate-limit-limit'],req.headers['x-rate-limit-remaining'], req.headers['x-rate-limit-reset']);
            }
            if (req.statusCode != 200) {
                this.logger.addOutput('ERROR: Status Code:' + req.statusCode+ ' Message ' +req.statusMessage, true);
                return null;
            }
            return req.body;
        } catch (err) {
            this.logger.addOutput('ERROR: Encountered an error while trying to get data (getArchiveSearchPage)', true);
            return null;
        }
    }

    ////////////////////////////////////////////////////////////////////////////////////
    /*                                                                                */
    /*                                   RATE LIMIT METHODS                           */
    /*                                                                                */
    ////////////////////////////////////////////////////////////////////////////////////

    /**
     * Updates the Rate Limits for archive search
     * @param xRateLimitLimitArchiveSearch 
     * @param xRateLimitRemainingArchiveSearch 
     * @param xRateLimitResetArchiveSearch 
     */
    private updateLimitsArchiveSearch(xRateLimitLimitArchiveSearch: number, xRateLimitRemainingArchiveSearch: number, xRateLimitResetArchiveSearch: number){
        this.xRateLimitLimitArchiveSearch = xRateLimitLimitArchiveSearch;
        this.xRateLimitRemainingArchiveSearch = xRateLimitRemainingArchiveSearch;
        this.xRateLimitResetArchiveSearch = xRateLimitResetArchiveSearch;
        this.lastCallArchiveSearch = this.getUTCMilliSecondsNow();

        this.logger.addOutput('Rate Limit Archive Search remaining: ' + xRateLimitRemainingArchiveSearch + ' Reset: ' + xRateLimitResetArchiveSearch, false);
    }

    /**
     * Checks if the Rate Limits allow another request and otherwise delays the method
     */
    private async requestArchiveSearch(): Promise<boolean>{
        if(this.xRateLimitRemainingArchiveSearch > 0){
            if(this.lastCallArchiveSearch + 1000 < this.getUTCMilliSecondsNow()){
                return true;
            }
            else{
                await this.delay((this.lastCallArchiveSearch + 1000) - this.getUTCMilliSecondsNow());
                return true;
            }
        }
        else{
            await this.delay(((this.xRateLimitResetArchiveSearch - this.getUTCSecondsNow())*1000) + 2000);
            return true;
        }
    }

    /**
     * Updates the Rate Limits for follower retrieval
     * @param xRateLimitLimitFollower 
     * @param xRateLimitRemainingFollower 
     * @param xRateLimitResetFollower 
     */
    private updateLimitsFollower(xRateLimitLimitFollower: number, xRateLimitRemainingFollower: number, xRateLimitResetFollower: number){
        this.xRateLimitLimitFollower = xRateLimitLimitFollower;
        this.xRateLimitRemainingFollower = xRateLimitRemainingFollower;
        this.xRateLimitResetFollower = xRateLimitResetFollower;
        this.lastCallFollower = this.getUTCMilliSecondsNow();

        this.logger.addOutput('Rate Limit Follower remaining: ' + xRateLimitRemainingFollower + ' Reset: ' + xRateLimitResetFollower, false);
    }

    /**
     * Checks if the Rate Limits allow another request and otherwise delays the method
     */
    private async requestFollower(): Promise<boolean>{
        if(this.xRateLimitRemainingFollower > 0){
            return true;
        }
        else{
            await this.delay(((this.xRateLimitResetFollower - this.getUTCSecondsNow())*1000) + 2000);
            return true;
        }
    }

    /**
     * Updates the Rate Limits for timeline retrieval
     * @param xRateLimitLimitTimeline 
     * @param xRateLimitRemainingTimeline 
     * @param xRateLimitResetTimeline 
     */
    private updateLimitsTimeline(xRateLimitLimitTimeline: number, xRateLimitRemainingTimeline: number, xRateLimitResetTimeline: number){
        this.xRateLimitLimitTimeline = xRateLimitLimitTimeline;
        this.xRateLimitRemainingTimeline = xRateLimitRemainingTimeline;
        this.xRateLimitResetTimeline = xRateLimitResetTimeline;
        this.lastCallTimeline = this.getUTCMilliSecondsNow();

        this.logger.addOutput('Rate Limit Timeline remaining: ' + xRateLimitRemainingTimeline + ' Reset: ' + xRateLimitResetTimeline, false);
    }

    /**
     * Checks if the Rate Limits allow another request and otherwise delays the method
     */
    private async requestTimeline(): Promise<boolean>{
        if(this.xRateLimitRemainingTimeline > 0){
            return true;
        }
        else{
            await this.delay(((this.xRateLimitResetTimeline - this.getUTCSecondsNow())*1000) + 2000);
            return true;
        }
    }

    /**
     * Returns a promise to delay the further execution
     * @param ms ms to delay
     */
    private delay(ms: number) {
        this.logger.addOutput('Rate-Limit reached. Delaying for '+(ms/1000)+' seconds', true);
        return new Promise( resolve => setTimeout(resolve, ms) );
    }

    /**
     * Gets the UTC time in seconds
     * @returns UTC in seconds
     */
    private getUTCSecondsNow(): number{
        return Math.round(Date.now() / 1000);
    }

    /**
     * Gets the UTC time in milliseconds
     * @returns UTC in milliseconds
     */
    private getUTCMilliSecondsNow(): number{
        return Date.now();
    }
}