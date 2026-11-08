"""Calls real, pinned reference implementations; contains no copied QR scorer."""
import importlib.metadata
import json
import sys
from qrcodegen import QrCode, QrSegment
from segno import encoder

assert importlib.metadata.version('qrcodegen') == '1.8.0'
assert importlib.metadata.version('segno') == '1.6.6'


class ScoredQr(QrCode):
    """Observe N3 hits in Nayuki's original scorer without changing its result."""
    def _finder_penalty_count_patterns(self, history):
        hits = super()._finder_penalty_count_patterns(history)
        self.n3_hits += hits
        return hits


def score(rows):
    matrix = [[int(bit) for bit in row] for row in rows]
    qr = object.__new__(ScoredQr)
    qr._size = len(matrix)
    qr._modules = matrix
    qr.n3_hits = 0
    total = qr._get_penalty_score()
    return {'nayuki': {'total': total, 'n3': qr.n3_hits * 40},
            'segno': list(encoder.mask_scores([bytearray(row) for row in matrix], len(matrix), len(matrix)))}


def encode(case):
    text, mode = case['text'], case['mode']
    encoding = case.get('encoding', 'iso-8859-1')
    if mode == 'numeric':
        segments = [QrSegment.make_numeric(text)]
    elif mode == 'alphanumeric':
        segments = [QrSegment.make_alphanumeric(text)]
    else:
        segments = [QrSegment.make_bytes(text.encode(encoding))]
    if case.get('eci'):
        segments.insert(0, QrSegment.make_eci(26))
    level = {'L': QrCode.Ecc.LOW, 'M': QrCode.Ecc.MEDIUM,
             'Q': QrCode.Ecc.QUARTILE, 'H': QrCode.Ecc.HIGH}[case['level']]
    result = {'nayuki': [], 'segno': [], 'segnoCodewordsNayuki': []}
    # Observe input codewords to distinguish a padding difference from masking.
    original_init = QrCode.__init__
    original_padding = encoder.write_padding_bits
    original_final = encoder.make_final_message
    def capture_init(self, version, error, data, mask):
        result['nayukiCodewords'] = list(data)
        original_init(self, version, error, data, mask)
    def capture_padding(buff, version, length):
        result['segnoPaddingStart'] = length
        original_padding(buff, version, length)
        result['segnoPaddingAdded'] = len(buff) - length
    def capture_final(version, error, buff):
        result['segnoCodewords'] = list(buff.toints())
        return original_final(version, error, buff)
    for mask in range(8):
        QrCode.__init__ = capture_init
        try:
            qr = QrCode.encode_segments(segments, level, case['version'], case['version'], mask, False)
        finally:
            QrCode.__init__ = original_init
        result['nayuki'].append([''.join('1' if qr.get_module(x, y) else '0'
                                             for x in range(qr.get_size())) for y in range(qr.get_size())])
        encoder.write_padding_bits = capture_padding
        encoder.make_final_message = capture_final
        try:
            qr = encoder.encode(text, error=case['level'], version=case['version'], mode=mode,
                                encoding=encoding, eci=case.get('eci', False), micro=False,
                                mask=mask, boost_error=False)
        finally:
            encoder.write_padding_bits = original_padding
            encoder.make_final_message = original_final
        result['segno'].append([''.join(map(str, row)) for row in qr.matrix])
        qr = QrCode(case['version'], level, bytes(result['segnoCodewords']), mask)
        result['segnoCodewordsNayuki'].append([''.join('1' if qr.get_module(x, y) else '0'
                                                     for x in range(qr.get_size())) for y in range(qr.get_size())])
    result['nayukiMask'] = QrCode.encode_segments(segments, level, case['version'], case['version'], -1, False).get_mask()
    selection_scores = []
    original_evaluate = encoder.evaluate_mask
    def observe(matrix, width, height):
        points = original_evaluate(matrix, width, height)
        selection_scores.append(points)
        return points
    encoder.evaluate_mask = observe
    try:
        automatic = encoder.encode(text, error=case['level'], version=case['version'], mode=mode,
                                   encoding=encoding, eci=case.get('eci', False), micro=False,
                                   boost_error=False)
    finally:
        encoder.evaluate_mask = original_evaluate
    result['segnoMask'] = automatic.mask
    result['segnoSelectionScores'] = selection_scores
    result['segnoAutomatic'] = [''.join(map(str, row)) for row in automatic.matrix]
    return result


request = json.load(sys.stdin)
scores = [score(rows) for rows in request['matrices']]
# One buffered write avoids millions of tiny pipe writes on Windows.
sys.stdout.write(json.dumps({'encoded': [encode(case) for case in request['cases']],
                            'scores': scores}, separators=(',', ':')))
