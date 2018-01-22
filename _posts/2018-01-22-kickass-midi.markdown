---
title:  "Kickass MIDI controller"
date:   2018-01-22 15:02:23
categories: [projects]
tags: [arduino, projects]
---
This awesome little project relies on the Arduino Mega 2560 and aims to turn your microcontroller into a virtual musical intrument.

Your machine will receive the serial data from the arduino board on a port.
The serial signal is mapped through the arduino application and is sent to a midi to serial bridge utility called [Hairless](http://projectgus.github.io/hairless-midiserial/).

Then you need a midi driver in order to use the midi-serial bridge information as a virtual intstrument in any Digital Audio Workstation. I used the [LoopBe1](http://www.nerds.de/en/loopbe1.html) driver.

The requirments are:
*  Arduino Mega 2560
*  Breadboard
*  11 Push Buttons
*  2 Potentiometers (one also has a switch)

<blockquote> - You can download the ".ino" file from here: &nbsp; &nbsp; &nbsp;
      <a href="/files/dmp_rework.ino">Download</a>
</blockquote>   

The wiring scheme can be viewed here:
![wiring]({{ "/images/arduino/fritz.png" | absolute_url }})

Have fun wiring that beast !
