export class DefaultConfiguration {
    detailedConsoleLogs = true;
    twitterAPI = {
        bearer: '', //bearer token to access the TwitterAPI
        userAgent: '', //Name of the App
    };
    database = {
        url: '',
        databaseName: '',
        auth: { username: '', password: '' },
    };
    keywords = {
        accounts: 'account1, account2', //e.g. 'account1, account2'
        hashtags: 'hashtag1, hashtag2', //e.g. 'hastag1, hastag2'
        dateFrom: '2021-01-01', //YYYY-MM-DDTHH:mm:ssZ (ISO 8601/RFC 3339)
        dateTo: '2021-07-31', //YYYY-MM-DDTHH:mm:ssZ (ISO 8601/RFC 3339)
    };
    steps = {
        step1: true, //Retrieving Users and Followers
        step2: true, //Retrieving Tweet Timelines and Tweet analysis for involved users
        step3: true, //Tweet Analysis
        step4: true, //Deleting involved users without edges
    }

    // For more information on the fields:
    // https://developer.twitter.com/en/docs/twitter-api/data-dictionary/object-model
    // default fields are always retrieved!
    userFields = {
        id              : true, //default
        name            : true, //default
        username        : true, //default
        created_at      : false,
        description     : false,
        entities        : false,
        location        : true,
        pinned_tweet_id : false,
        profile_image_url : false,
        protected       : false,
        public_metrics  : false,
        url             : false,
        verified        : true,
        withheld        : false,
    };

    tweetFields = {
        id              : true, //default
        text            : true, //default
        attachments     : false,
        author_id       : true, //must be set
        context_annotations : false,
        conversation_id : true,
        created_at      : true,
        entities        : true, //must be set
        geo             : false,
        in_reply_to_user_id : true,
        lang            : true,
        non_public_metrics : false,
        organic_metrics : false,
        possibly_sensitive : false,
        promoted_metrics : false,
        public_metrics  : false,
        referenced_tweets : true, //must be set
        reply_settings  : false,
        source          : false,
        withheld        : false,
    };
}