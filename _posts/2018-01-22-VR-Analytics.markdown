---
title:  "VR-Analytics"
date:   2018-01-22 15:04:23
categories: [projects]
tags: [projects]
---
#### __Synopsis__
Project repo: [https://github.com/mihaimpop/vr-analytics](https://github.com/mihaimpop/vr-analytics) 

Hi there. I've built this project for dynamic data visualization and manipulation using virtual reality as a means of display. For interacting with the virtual scene the Leap Motion controller was used.
![Kickass photo]({{ "/images/vr-analytics/8.PNG" | absolute_url }})

The project consists of two applications:
  *  Server application (serves static data)
  *  Unity application (renders the virtual scene and permits interaction with the Leap Motion sensor)  

#### __Server application__
The server application is a node application which uses MongoDB as a database solution. The app serves data on a defined endpoint and permits filtering according to query parameters passed from the Unity application.

API reference
![API]({{ "/images/vr-analytics/5.PNG" | absolute_url }})

#### __Unity application__
The unity application receives the queried resource from the server application. The received resource is mapped and displayed in the virtual scene as a cube of cubes. These cubes have distinct properties:
  *  color
  *  name
  *  influence

The mapped cubes respect these properties;  they are shaded, scaled and named according to those properties.
![map]({{ "/images/vr-analytics/luc0.PNG" | absolute_url }})
![info]({{ "/images/vr-analytics/luc4.PNG" | absolute_url }})

The Unity application supports advanced querying by using the query builder panel.
![query]({{ "/images/vr-analytics/4.PNG" | absolute_url }})

Sample filtered scene.
![filter]({{ "/images/vr-analytics/luc5.PNG" | absolute_url }})





