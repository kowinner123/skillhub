package com.iflytek.skillhub.auth.oauth;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.iflytek.skillhub.auth.rbac.PlatformPrincipal;
import com.iflytek.skillhub.auth.session.PlatformSessionService;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Login success handler that copies the resolved platform principal into the
 * HTTP session and then redirects to the stored return target or default URL.
 *
 * <p>This handler extends {@link SimpleUrlAuthenticationSuccessHandler} and only
 * uses the returnTo parameter stored in session and the default target URL for
 * redirect decisions, ignoring any saved request from Spring Security's RequestCache.
 *
 * <p>When {@code skillhub.public.base-url} is configured, all redirects are made
 * absolute using that base URL so they are not subject to X-Forwarded-Host
 * interpretation by the servlet container.
 */
@Component
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final PlatformSessionService platformSessionService;
    private final OAuthLoginFlowService oauthLoginFlowService;
    private final String publicBaseUrl;

    public OAuth2LoginSuccessHandler(PlatformSessionService platformSessionService,
                                     OAuthLoginFlowService oauthLoginFlowService,
                                     @Value("${skillhub.public.base-url:}") String publicBaseUrl) {
        this.platformSessionService = platformSessionService;
        this.oauthLoginFlowService = oauthLoginFlowService;
        this.publicBaseUrl = StringUtils.hasText(publicBaseUrl)
                ? publicBaseUrl.stripTrailing()
                : "";
        setDefaultTargetUrl(OAuthLoginRedirectSupport.DEFAULT_TARGET_URL);
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                         Authentication authentication) throws IOException, ServletException {
        if (authentication.getPrincipal() instanceof OAuth2User oAuth2User) {
            PlatformPrincipal principal = (PlatformPrincipal) oAuth2User.getAttributes().get("platformPrincipal");
            if (principal != null) {
                platformSessionService.attachToAuthenticatedSession(principal, authentication, request);
            }
        }
        String returnTo = oauthLoginFlowService.consumeReturnTo(request.getSession(false));
        String target = returnTo != null ? returnTo : OAuthLoginRedirectSupport.DEFAULT_TARGET_URL;
        getRedirectStrategy().sendRedirect(request, response, toAbsolute(target));
        clearAuthenticationAttributes(request);
    }

    /**
     * Prepends {@code publicBaseUrl} to a relative path so the Location header
     * is always an absolute URL pointing to the correct public host, regardless
     * of how the servlet container resolves forwarded headers.
     */
    private String toAbsolute(String path) {
        if (!publicBaseUrl.isEmpty() && path.startsWith("/")) {
            return publicBaseUrl + path;
        }
        return path;
    }
}
