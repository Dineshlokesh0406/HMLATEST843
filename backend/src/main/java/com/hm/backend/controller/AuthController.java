package com.hm.backend.controller;

import com.hm.backend.dto.AuthDtos.AuthResponse;
import com.hm.backend.dto.AuthDtos.ForgotPasswordRequest;
import com.hm.backend.dto.AuthDtos.LoginRequest;
import com.hm.backend.dto.AuthDtos.PasswordResetStartResponse;
import com.hm.backend.dto.AuthDtos.RegisterRequest;
import com.hm.backend.dto.AuthDtos.ResetPasswordRequest;
import com.hm.backend.service.AuthService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public AuthResponse register(@RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/forgot-password")
    public PasswordResetStartResponse forgotPassword(@RequestBody ForgotPasswordRequest request) {
        return authService.startPasswordReset(request);
    }

    @PostMapping("/reset-password")
    public com.hm.backend.dto.ApiResponse resetPassword(@RequestBody ResetPasswordRequest request) {
        return authService.resetPassword(request);
    }
}
