package com.hm.backend.service;

import com.hm.backend.repository.BookingRepository;
import com.hm.backend.repository.BookingRepository.BookingInvoiceDetails;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;

@Service
public class PdfService {

    private final BookingRepository bookingRepository;

    public PdfService(BookingRepository bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    public byte[] bookingReceipt(String bookingCode) {
        BookingInvoiceDetails details = bookingRepository.findInvoiceDetails(bookingCode);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        Document document = new Document();
        PdfWriter.getInstance(document, output);
        document.open();

        Font titleFont = new Font(Font.HELVETICA, 18, Font.BOLD);
        Font headingFont = new Font(Font.HELVETICA, 12, Font.BOLD);
        Paragraph title = new Paragraph("LUXE HOTELS Booking Receipt", titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        document.add(title);
        document.add(new Paragraph(" "));

        PdfPTable table = new PdfPTable(2);
        table.setWidthPercentage(100);
        addRow(table, "Booking ID", details.bookingCode());
        addRow(table, "Transaction ID", details.transactionId());
        addRow(table, "User", details.fullName() + " (" + details.userCode() + ")");
        addRow(table, "Email", details.email());
        addRow(table, "Phone", details.countryCode() + " " + details.phoneNumber());
        addRow(table, "Hotel", details.hotelName() + ", " + details.cityName());
        addRow(table, "Room", details.roomType() + " - " + details.roomNumber());
        addRow(table, "Dates", details.checkInDate() + " to " + details.checkOutDate());
        addRow(table, "Payment Status", details.paymentStatus());
        addRow(table, "Base Amount", "Rs " + details.baseAmount());
        addRow(table, "GST / Tax", "Rs " + details.taxAmount());
        addRow(table, "Discount", "Rs " + details.discountAmount());
        addRow(table, "Total Amount", "Rs " + details.totalAmount());
        document.add(table);
        document.add(new Paragraph(" "));
        document.add(new Paragraph("This is a system-generated receipt.", headingFont));
        document.close();
        return output.toByteArray();
    }

    private void addRow(PdfPTable table, String label, String value) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label));
        PdfPCell valueCell = new PdfPCell(new Phrase(value == null ? "" : value));
        labelCell.setPadding(7);
        valueCell.setPadding(7);
        table.addCell(labelCell);
        table.addCell(valueCell);
    }
}
