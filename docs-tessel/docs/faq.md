# FAQ

### What is Organiq on Tessel

It's a framework that allows web applications to easily interact with code running on Tessel microcontrollers.

### What's the difference between the 'organiq' and 'organiq-tessel' packages?

`organiq` is the core NPM package that includes the core SDK, test cases, development server, command line interface, and example programs. For developing browser-based or Node.js applications that use Organiq, this package is all you need.

`organiq-tessel` is a minimal package that includes just the resources necessary for using Organiq on Tessel at runtime. When writing and deploying code to Tessel, this is the only package you should reference.

### Why is a web service necessary?

While the library tries hard to make it feel like web applications are interacting directly with the Tessel, that's not actually the case. The applications and devices both connect to the Organiq server, which then acts a lot like a request broker to forward requests from one party to another.

There are several reasons for using a central server instead of connecting directly one to the other. It allows for easy traversal of internal networks and firewalls, it allows the device to maintain a single network connection even when multiple applications are interacting with it, it allows centralized discovery, etc.

### Is there a public Organiq server I can use instead of using the development server?

There is currently no publicly-available Organiq web service. You need to run your own development server, which is included with the `organiq` package and which can be started with:

    organiq server start 

### Is Organiq on Tessel secure?

There is no support for authentication or authorization in the development version of the Organiq server. This means that any application that can reach your Organiq server can connect to and potentially do crazy things with your Tessel. It's probably not a good idea to host the development server on any internet-accessible hosts.


