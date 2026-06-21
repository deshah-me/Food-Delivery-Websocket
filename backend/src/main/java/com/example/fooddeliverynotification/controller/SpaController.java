package com.example.fooddeliverynotification.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaController {

    // Forward all routes except those containing a dot (static files) and API/WebSocket paths
    @RequestMapping(value = {"/{path:^(?!api|ws).*$}", "/**/{path:^(?!api|ws).*$}"})
    public String forward() {
        return "forward:/index.html";
    }
}
