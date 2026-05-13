package com.hm.backend.dto;

import java.util.List;

public record PageResponse<T>(
    List<T> content,
    int pageNumber,
    int pageSize,
    long totalElements,
    int totalPages
) {
    public static <T> PageResponse<T> of(List<T> content, int pageNumber, int pageSize, long totalElements) {
        int totalPages = pageSize <= 0 ? 1 : (int) Math.ceil((double) totalElements / pageSize);
        return new PageResponse<>(content, pageNumber, pageSize, totalElements, Math.max(1, totalPages));
    }
}
