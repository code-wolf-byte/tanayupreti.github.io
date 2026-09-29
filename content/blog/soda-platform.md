[post]
title = "SoDA Platform"
date = 2026-09-29

[meta]
tags = ["flask", "python", "react"]
draft = false

[content]
## Introduction

So [this project](https://github.com/asusoda/platform) has gone through many revisions and was never expected to be what it is today.
This project started as a simple discord bot to play jeopardy with the members in the [SoDA](https://thesoda.io) discord, a feature still not implemented (lol).

## The Project
The initial idea was to create a react UI as a full-fledged discord bot was already created by a previous officer. Since Discord's interaction UI offered very little control over the flow and plus is very hard to deal with (or so did I think), I decided to go for a flask backend, which would be easier to manage and create a frontend using a react app.

I am never comfortable on working on the frontend as I do not have a preference for JS, but to help me there was this new tool called ChatGPT. ChatGPT was in its earliest forms when this project was being worked on so I used it to piece together the application. I had no idea what I was doing, this being one of my first full stack apps so I might have made a lot of mistakes. And I mean **a lot** (i am guilty of pushing node_modules).

After a few rounds of testing this with some officers, we realized this was a good enough implementation of the project and this was decided to be a internal application used for running jeopardy in the discord. Little did I know, we would never use it.

### The Expansion
A few months go by and we have not used the application. And here is where an idea strikes me, the club was struggling with membership and people not attending events. So I thought why not gamify it a bit? Hence, came in a [points system](https://github.com/asusoda/platform/tree/main/modules/points). Encouraging members to attend events for meaningless internet points.

This opened a whole new system to me for seeing the scope of this application. We needed an auth system, a database, a CI/CD pipeline because things can't break in production and so much more. Since this was going to be a public facing application, we had to make significant changes to the organization's operations. Such as:

- Making sure to check everybody in during events. This was previously done but was not taken as seriously
- Adding proper authentication so only the officers could access and award points.
- Assigning responsibilities to officers to upload the points data.
- and more.

### The Modular monolith system
After being deployed for some time an officer suggested we should add the events to the club's website and can be automated through the notion API. This was a great idea because it would allow us to automate the process of adding new events, making sure they are up to date with the latest information. The only problem being, we can't directly expose the notion API to the website, so since the platform already had authentication setup, we decided to route the notion data through the application using the webserver as an intermediary. This way we could have a secure connection between the notion and the website while still allowing for the events to be added automatically.

This is how the [calendar](https://github.com/asusoda/platform/tree/main/modules/calendar) was implemented. With the system now serving 2 purposes, we had to build an authentication system that can be shared between different services thus bringing into something which was kinda new to me but apparently was a genius idea of using decorators to handle the [auth](https://github.com/asusoda/platform/tree/main/modules/auth) logic.

The code was broken down into a modular structure, with each module being created and maintained by a different officer. This was done so that each service could be maintained by an individual without having to worry about the rest of the system. So a broken service, does not take the whole system down. The only rule we had to follow was **DO NOT BREAK AUTH.** And once the rules were set, it wasn't too difficult to keep that rule intact.

The auth module was a standalone service that could be used by any other service in the system, and its main purpose is to authenticate users based on OAuth2 tokens. The auth module is responsible for following the rules we had set in place. Any request that needs authentication had `@auth_required` before defining its route. So the webserver would check for authentication before executing a user's request.

The modularity also created a lot of standardization in the codebase. For example, all modules were defined in `modules/` and followed the following standards:
```
module_name/
├── api.py           # Public API endpoints and route handlers
├── models.py        # Database models and schemas specific to the module
├── migrations/      # Database migrations (if needed)
└── README.md        # Module-specific documentation
```
With this standardization, it was easier for us to add new services and modules in the future without having to worry about how they would interact with each other.


This meant, we can now build services much more quickly by just re-using the authentication system. And so it did, officers came up with all sorts of services that helped the organization run better and more efficiently. Such as a storefront for spending the above mentioned points, a module dedicated to organizations for allowing other clubs to use the same tools we built and still a lot in development.


Over the years, the project has had 15+ officers contribute to it and some of the names without which this would not be possible are: [Ben](https://github.com/benjuntilla) and [Ash](https://github.com/ashworks1706). They have contributed significantly to the development of this project.  Plus we also managed an uptime of 100% recently, which is kinda insane since we were constantly breaking things.

![Uptime](/blog/soda-platform/uptime.png "Uptime")
