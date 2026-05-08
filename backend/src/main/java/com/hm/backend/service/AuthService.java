package com.hm.backend.service;

import com.hm.backend.dto.AuthDtos.AuthResponse;
import com.hm.backend.dto.AuthDtos.LoginRequest;
import com.hm.backend.dto.AuthDtos.RegisterRequest;
import com.hm.backend.exception.ApiException;
import com.hm.backend.repository.UserRepository;
import com.hm.backend.repository.UserRepository.UserRecord;
import com.hm.backend.util.HashUtils;
import com.hm.backend.util.ValidationUtils;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public AuthResponse register(RegisterRequest request) {
        String fullName = ValidationUtils.validateFullName(request.fullName());
        String email = ValidationUtils.normalizeEmail(request.email());
        String phoneNumber = ValidationUtils.validatePhone(request.phoneNumber());
        String address = ValidationUtils.requireTrimmed(request.address(), "Address");
        String username = ValidationUtils.requireTrimmed(request.username(), "Username");
        String password = ValidationUtils.validatePassword(request.password());
        String confirmPassword = ValidationUtils.requireTrimmed(request.confirmPassword(), "Confirm password");

        if (!password.equals(confirmPassword)) {
            throw new ApiException("Passwords do not match.");
        }
        if (userRepository.existsByEmail(email)) {
            throw new ApiException("Email already registered.");
        }
        if (userRepository.existsByPhone(phoneNumber)) {
            throw new ApiException("Mobile number already registered.");
        }
        if (userRepository.existsByUsername(username)) {
            throw new ApiException("Username must be at least 5 characters and unique.");
        }

        String userCode = userRepository.nextCustomerCode();
        userRepository.createCustomer(
            userCode,
            fullName,
            email,
            request.countryCode() == null || request.countryCode().isBlank() ? "+91" : request.countryCode().trim(),
            phoneNumber,
            address,
            username,
            HashUtils.sha256(password)
        );
        return new AuthResponse("Registration successful.", userCode, fullName, email, "CUSTOMER");
    }

    public AuthResponse login(LoginRequest request) {
        String selectedRole = ValidationUtils.requireTrimmed(request.role(), "Role").toUpperCase();
        String identifier = ValidationUtils.requireTrimmed(request.usernameOrEmail(), "Username or email").toLowerCase();
        String password = ValidationUtils.requireTrimmed(request.password(), "Password");

        UserRecord user = userRepository.findByUsernameOrEmail(identifier)
            .orElseThrow(() -> new ApiException("Invalid username or password."));

        if (!selectedRole.equals(user.role())) {
            throw new ApiException("Selected role does not match the user account.");
        }

        if ("LOCKED".equalsIgnoreCase(user.accountStatus())) {
            throw new ApiException("Your account is locked. Please contact support.");
        }

        String hashedPassword = HashUtils.sha256(password);
        if (!hashedPassword.equals(user.passwordHash())) {
            int nextAttempts = user.failedLoginAttempts() + 1;
            String nextStatus = nextAttempts >= 3 ? "LOCKED" : user.accountStatus();
            userRepository.updateLoginState(user.userId(), nextAttempts, nextStatus);
            if ("LOCKED".equals(nextStatus)) {
                throw new ApiException("Your account is locked. Please contact support.");
            }
            throw new ApiException("Invalid username or password.");
        }

        userRepository.updateLoginState(user.userId(), 0, user.accountStatus());
        return new AuthResponse("Login successful.", user.userCode(), user.fullName(), user.email(), user.role());
    }
}
