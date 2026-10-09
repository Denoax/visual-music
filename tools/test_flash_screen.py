import unittest
import numpy as np
from flash_screen import Analyzer
class ScreeningContract(unittest.TestCase):
    def sequence(self,fn):
        a=Analyzer(12,12)
        for i in range(180):a.add(np.broadcast_to(np.array(fn(i),np.uint8),(12,12,3)).copy())
        return a.result()
    def test_four_hz_luminance_oscillation_is_detected(self):
        r=self.sequence(lambda i:[240]*3 if (i//7)%2 else [0]*3)
        self.assertGreaterEqual(r['general_max_pairs_in_one_second_per_pixel'],4)
        self.assertEqual(r['general_max_field_fraction_at_four_or_more_pairs'],1)
    def test_slow_fade_does_not_become_repeated_flashes(self):
        r=self.sequence(lambda i:[int(255*i/179)]*3)
        self.assertEqual(r['general_max_pairs_in_one_second_per_pixel'],0)
    def test_saturated_red_blue_opposing_transitions_are_detected(self):
        r=self.sequence(lambda i:[255,0,0] if (i//7)%2 else [0,0,255])
        self.assertGreaterEqual(r['red_max_pairs_in_one_second_per_pixel'],4)
if __name__=='__main__':unittest.main()
