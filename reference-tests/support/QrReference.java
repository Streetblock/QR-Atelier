package com.google.zxing.qrcode.encoder;

import com.google.zxing.EncodeHintType;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.EnumMap;

/** Package access lets tests call the original Java MaskUtil directly. */
public final class QrReference {
  public static void main(String[] args) throws Exception {
    var input = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
    for (String line; (line = input.readLine()) != null;) {
      String[] fields = line.split("\t");
      if (fields[0].equals("score")) {
        String[] rows = fields[1].split("/");
        var matrix = new ByteMatrix(rows.length, rows.length);
        for (int y = 0; y < rows.length; y++) for (int x = 0; x < rows.length; x++)
          matrix.set(x, y, rows[y].charAt(x) - '0');
        System.out.println(MaskUtil.applyMaskPenaltyRule1(matrix) + "," +
            MaskUtil.applyMaskPenaltyRule2(matrix) + "," +
            MaskUtil.applyMaskPenaltyRule3(matrix) + "," +
            MaskUtil.applyMaskPenaltyRule4(matrix));
      } else {
        var hints = new EnumMap<EncodeHintType, Object>(EncodeHintType.class);
        hints.put(EncodeHintType.QR_VERSION, Integer.parseInt(fields[1]));
        int mask = Integer.parseInt(fields[3]);
        if (mask >= 0) hints.put(EncodeHintType.QR_MASK_PATTERN, mask);
        // Omitting CHARACTER_SET preserves the default Latin-1 without ECI.
        if (fields[4].equals("utf-8")) hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
        String text = new String(Base64.getDecoder().decode(fields[5]), StandardCharsets.UTF_8);
        var qr = Encoder.encode(text, ErrorCorrectionLevel.valueOf(fields[2]), hints);
        StringBuilder rows = new StringBuilder();
        for (int y = 0; y < qr.getMatrix().getHeight(); y++) {
          if (y > 0) rows.append('/');
          for (int x = 0; x < qr.getMatrix().getWidth(); x++) rows.append(qr.getMatrix().get(x, y));
        }
        System.out.println(qr.getMode() + ":" + qr.getMaskPattern() + ":" + rows);
      }
    }
  }
}
