package com.hm.backend.service;

import com.hm.backend.dto.ApiResponse;
import com.hm.backend.dto.AuthDtos.AuthResponse;
import com.hm.backend.dto.AuthDtos.ForgotPasswordRequest;
import com.hm.backend.dto.AuthDtos.LoginRequest;
import com.hm.backend.dto.AuthDtos.PasswordResetStartResponse;
import com.hm.backend.dto.AuthDtos.RegisterRequest;
import com.hm.backend.dto.AuthDtos.ResetPasswordRequest;
import com.hm.backend.exception.ApiException;
import com.hm.backend.repository.PasswordResetRepository;
import com.hm.backend.repository.UserRepository;
import com.hm.backend.repository.UserRepository.UserRecord;
import com.hm.backend.util.HashUtils;
import com.hm.backend.util.ValidationUtils;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordResetRepository passwordResetRepository;

    public AuthService(UserRepository userRepository, PasswordResetRepository passwordResetRepository) {
        this.userRepository = userRepository;
        this.passwordResetRepository = passwordResetRepository;
    }

    public AuthResponse register(RegisterRequest request) {
        String fullName = ValidationUtils.validateFullName(request.fullName());
        String email = ValidationUtils.normalizeEmail(request.email());
        String countryCode = request.countryCode() == null || request.countryCode().isBlank() ? "+91" : request.countryCode().trim();
        String phoneNumber = ValidationUtils.validatePhone(request.phoneNumber(), countryCode);
        String address = ValidationUtils.requireTrimmed(request.address(), "Address");
        String username = ValidationUtils.requireTrimmed(request.username(), "Username");
        String password = ValidationUtils.validatePassword(request.password());
        String confirmPassword = ValidationUtils.requireTrimmed(request.confirmPassword(), "Confirm password");

        if (!password.equals(confirmPassword)) {
            throw new ApiException("Passwords do not match.");
        }
        if (userRepository.existsByEmail(email)) {
            throw new ApiException("Email already exists.");
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
            countryCode,
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

    public PasswordResetStartResponse startPasswordReset(ForgotPasswordRequest request) {
        String username = ValidationUtils.requireTrimmed(request.username(), "Username");
        String email = ValidationUtils.normalizeEmail(request.email());
        String phoneNumber = ValidationUtils.requireTrimmed(request.phoneNumber(), "Phone number").replaceAll("\\D", "");
        if (phoneNumber.isBlank()) {
            throw new ApiException("Phone number is required.");
        }
        UserRecord user = userRepository.findByUsernameEmailAndPhone(username, email, phoneNumber)
            .orElseThrow(() -> new ApiException("Username, email, and phone number do not match any active account."));
        if ("LOCKED".equalsIgnoreCase(user.accountStatus())) {
            throw new ApiException("Your account is locked. Please contact support.");
        }

        String resetToken = UUID.randomUUID().toString() + "-" + UUID.randomUUID();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(10);
        passwordResetRepository.invalidateForUser(user.userId());
        passwordResetRepository.create(user.userId(), HashUtils.sha256("IDENTITY_VERIFIED"), HashUtils.sha256(resetToken), expiresAt);
        return new PasswordResetStartResponse(
            "Details verified. You can reset your password now.",
            resetToken,
            expiresAt.toString()
        );
    }

    public ApiResponse resetPassword(ResetPasswordRequest request) {
        String token = ValidationUtils.requireTrimmed(request.token(), "Reset token");
        String password = ValidationUtils.validatePassword(request.newPassword());
        String confirmPassword = ValidationUtils.requireTrimmed(request.confirmPassword(), "Confirm password");
        if (!password.equals(confirmPassword)) {
            throw new ApiException("Passwords do not match.");
        }
        var reset = passwordResetRepository.findActiveByToken(HashUtils.sha256(token))
            .orElseThrow(() -> new ApiException("Reset token is invalid or expired."));
        userRepository.updatePassword(reset.userId(), HashUtils.sha256(password));
        passwordResetRepository.markUsed(reset.resetId());
        return new ApiResponse("Password reset successful. Please login with your new password.");
    }
}
