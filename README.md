# HyperHost
##Webservers, without servers.

HyperHost allows hosting of static websites directly from the browser using P2P WebRTC and a custom rendering framework.

Simply go to https://rationalcoding.github.io/HyperHost/ and drag n' drop the root folder of your website containing at least a **index.html**. Your website will be proccessed and displayed in your browser a few seconds. Then, *anyone* can access your site at the same URL. That's it.

Your site will be available so long as your browser has an uninterrupted network connection. All resources are served via a encrypted P2P connection. Any static resources can be served.

##The static backend is NO MORE.

**Current Limitations:**  
- Both host and clients must be using a relatively new version of Chrome.  (The client will *partially* work on Firefox/Opera.)
- Very large websites, **more than 50MB**, can freeze up when clients attempt to load them. (This will be fixed.)  
- Fonts cannot be hosted yet as their encoding is different from other assets.  (This will be fixed.)
- URLs pointing to hosted files inside **Javascript and CSS** files will not work. **External URLs will work.** (CSS will be supported soon, JS might get a partial fix.)
- Huge assets like long videos or high-res images will crash the host due to encoding being impossible. (These need to be moved to blobs!)

**Upcoming Features:**  
- Virtual backend - Handle API calls and subsequent calls to the host, allow session management and small databases.

**Notes:**  
You can host the files in this repo anywhere (even on a file:// domain!) if you don't want to use Github's servers.

