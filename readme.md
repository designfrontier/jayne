# jayne

## What is this?
 jayne is a middleware/pipe function system for outbound http(s) requests in the browser. 

## Using jayne

### Get it on the page
 To include it in your dependencies: `bower install jayne` then get it on the page like this:

 ```
<script src="bower_components/jayne/dist/jayne.min.js"></script>
 ```

### Add your own functions
functions that are passed in are handled in the order in which they are added. They recieve two inputs `function (previous, original, request){}` which are the output of the previous function and the original response object, lastly the request object is included in case you need it for something. (The first function in the line will get the original response as both inputs) These functions are expected to return a modified version of the Response which then becomes the `previous` input to the next function in the queue.

For example a response handler:
```
function (previous, original) {
	previous.timeOffset = new Date().getTime() - new Date(previous.body.timeStamp).getTime();

	return previous;
}
```

Request handlers are also allowed and they recieve the request object in previous and original forms as well. If you wish to shortcircuit the request (preventing it from actually being sent) set `previous.response` to the value you want returned as the response body. This value can be overwritten by others and/or modified by them.

### getting functions in there
```
jayne({
    response: [
        function(previous, original) {
            return previous;
        }
    ]
    , request: [
        function (previous, original) {
            return previous;
        }
    ]
})
```
