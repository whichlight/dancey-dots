dancey-dots
===========

play with the app here: http://whichlight.synth_fun.jit.su/
share the link with the friend to bring them in as well. 
it is a collective browser synth

background
----------
I've wanted to have a collaborative jam session in the browser for a while.  Not
so much step sequencing, and more making wild sounds.  It started with the idea
of droning together, and then grew from there.  So I'm really excited to share
this.  it is amazing to see what is possible now with node and socketio.  I love interactive art between multiple people, so the most joyful thing
for me has been to see how people use this, how languages form, and we can form
little games together from gestures.   

its also pretty wild playing with someone else here anonymously.
You'll find a lot of personality can be embedded in a dot that makes sounds. 


technicals
----------
I use a node.js server and socket.io.  The mouse positions are shared and map
to a synth.  The synth uses the web audio api, so currently it only works in
chrome.

todo
----
currently it scales to about five people, and then it lags.  I'm sure there are
ways to optimize the synth and the message passing.  Thats what I plan on
working on next, and any insights are welcome. 


author
------
Kawandeep Virdee, @kawantum , www.whichlight.com
