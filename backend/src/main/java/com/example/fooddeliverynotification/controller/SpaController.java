package com.example.fooddeliverynotification.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaController {

    /**
     * Catch-all forward to index.html for React Router.
     *
     * The regex anchors ensure:
     *   - Paths starting with "api" or "ws" are excluded (REST + WebSocket).
     *   - Paths whose final segment contains a dot are excluded (static assets
     *     such as .js, .css, .png) so Spring's resource handler serves them.
     *   - Everything else is forwarded to index.html, letting React Router
     *     handle /customer, /kitchen, and any future client-side routes.
     *
     * The explicit forward to /index.html (not a redirect) means the browser
     * URL stays unchanged and there is no redirect loop.
     */
    @RequestMapping(value = {
        "/{path:^(?!api$|ws$|index\\.html$)[^.]*$}",
        "/**/{path:^(?!api$|ws$|index\\.html$)[^.]*$}"
    })
    public String forward() {
        return "forward:/index.html";
    }
}
