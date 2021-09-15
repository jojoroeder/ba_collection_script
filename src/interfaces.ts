////////////////////////////////////////////////////////////////////////////////////
/*                                                                                */
/*                                      CONFIG                                    */
/*                                                                                */
////////////////////////////////////////////////////////////////////////////////////

export class Config {
    detailedConsoleLogs: boolean;
    twitterAPI: TwitterAPISettings;
    database: DatabaseSettings;
    keywords: Keywords;
    userFields: UserFields;
    tweetFields: TweetFields;
    steps: Steps;
}

export class TwitterAPISettings{
    bearer: string;
    userAgent: string;
}

export class DatabaseSettings{ //Corresponding to arangoJS
    url: string;
    databaseName: string;
    auth: DatabaseAuth;
}

class DatabaseAuth {
    username: string;
    password: string;
}

class Keywords{
    accounts: string;
    hashtags: string;
    dateFrom: Date;
    dateTo: Date;
}

class Steps{
    step1: boolean;
    step2: boolean;
    step3: boolean;
    step4: boolean;
}

// For more information on the fields:
// https://developer.twitter.com/en/docs/twitter-api/data-dictionary/object-model
export class UserFields{
    id: boolean; //default
    name: boolean; //default
    username: boolean; //default
    created_at: boolean;
    description: boolean;
    entities: boolean;
    location: boolean;
    pinned_tweet_id: boolean;
    profile_image_url: boolean;
    protected: boolean;
    public_metrics: boolean;
    url: boolean;
    verified: boolean;
    withheld: boolean;
}

export class TweetFields{
    id: boolean; //default
    text: boolean; //default
    attachments: boolean;
    author_id: boolean; //must be set
    context_annotations: boolean;
    conversation_id: boolean;
    created_at: boolean;
    entities: boolean; //must be set
    geo: boolean;
    in_reply_to_user_id: boolean;
    lang: boolean;
    non_public_metrics: boolean;
    organic_metrics: boolean;
    possibly_sensitive: boolean;
    promoted_metrics: boolean;
    public_metrics: boolean;
    referenced_tweets: boolean; //must be set
    reply_settings: boolean;
    source: boolean;
    withheld: boolean;
} 

////////////////////////////////////////////////////////////////////////////////////
/*                                                                                */
/*                        TWITTER API AND DATABASE                                */
/*                                                                                */
////////////////////////////////////////////////////////////////////////////////////

export class User{
    _key: string; //datbase key is same as id
    id: string; //default
    name: string; //default
    username: string; //default
    created_at: Date;
    description: string;
    entities: any;
    location: string;
    pinned_tweet_id: string;
    profile_image_url: string;
    protected: boolean;
    public_metrics: any;
    url: string;
    verified: boolean;
    withheld: any;
    step2Performed: boolean = false;
}

export class Tweet{
    _key: string; //datbase key is same as id
    id: string; //default
    text: string; //default
    attachments: any;
    author_id: string;
    context_annotations: any[];
    conversation_id: string;
    created_at: Date;
    entities: any;
    geo: any;
    in_reply_to_user_id: string;
    lang: string;
    non_public_metrics: any;
    organic_metrics: any;
    possibly_sensitive: boolean;
    promoted_metrics: any;
    public_metrics: any;
    referenced_tweets: any[];
    reply_settings: string;
    source: string;
    withheld: any;
} 

export class MentionRelationship{
    _key: string;   //corresponds to document id which is collectionName/_key
    _from: string;  //corresponds to document id which is collectionName/_key
    _to: string;    //corresponds to document id which is collectionName/_key
    tweetId: string; //corresponding tweet id of the mention
    userId: string; //User that is being mentioned
    username: string; //Username that is being mentioned
}

export class RetweetRelationship{
    _key: string;   //corresponds to document id which is collectionName/_key
    _from: string;  //corresponds to document id which is collectionName/_key
    _to: string;    //corresponds to document id which is collectionName/_key
    tweetId: string; //corresponding tweet id of the retweet
    retweetedTweetId: string;
}