/**
 * returns a function that acts like the Redis command indicated by cmd except that it will time out after a given number of milliseconds
 * 
 * @param {object} client The redis client
 * @param {string} cmd The redis commmand to execute ('get','hset','sort', etc.)
 * @param {integer} timeLimit The number of milliseconds to wait until returning an error to the callback.
 * 
 */
function timeLimited(client, cmd, timeLimit) {
    //We aren't defining arguments here - this will allow the flexibility of passing a variable number of arguments to Redis
    return function (..._arg: any) { //look ma, no explicit arguments
        var
            //arguments, even if not defined in the function declaration, are still stored in the arguments pseudo-array.
            //We'll first have to convert the arguments into a real array using slice - this will allow us to push/pop/apply to it
            argsAsArr = Array.prototype.slice.call(arguments),
            //assume that the last argument of any given call is a callback
            cb = argsAsArr.pop(),
            //we'll hold the reference to the timeout in this variable
            timeoutHandler;

        //after the timeLimit, throw an error
        timeoutHandler = setTimeout(function () {
            cb(new Error('Redis timed out'));
            //make cb a no-op to prevent double callback
            cb = function () { };
        }, timeLimit);

        //since we've pop'ed off the original cb - let's add in our own replacement callback
        argsAsArr.push(function (err, values) {
            //disable the original timeout
            clearTimeout(timeoutHandler);
            //call back as normal
            cb(err, values);
        });

        //send the original arguments, with the replaced callback
        client[cmd].apply(client, argsAsArr);
    };
}

export default timeLimited; 