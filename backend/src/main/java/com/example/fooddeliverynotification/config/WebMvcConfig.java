package com.example.fooddeliverynotification.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Forwards all non-API, non-static-asset routes to index.html so that
 * React Router can handle client-side navigation for paths like /customer
 * and /kitchen without Spring Boot returning a 404.
 *
 * Exclusions (handled by their own mappings / resource handlers):
 *   - /api/**      → REST controllers
 *   - /ws/**       → WebSocket handlers
 *   - Paths with a file extension (e.g. .js, .css, .png) → static assets
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // Explicit SPA entry-point routes — extend this list as new top-level
        // React routes are added, or rely on SpaController for catch-all coverage.
        registry.addViewController("/customer").setViewName("forward:/index.html");
        registry.addViewController("/kitchen").setViewName("forward:/index.html");
    }
}
