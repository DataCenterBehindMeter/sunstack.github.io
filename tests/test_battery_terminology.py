import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class BatteryTerminologyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "index.html").read_text()
        cls.readme = (ROOT / "README.md").read_text()
        cls.generator = (ROOT / "tools" / "generate_images.py").read_text()

    def test_page2_uses_requested_power_source_copy(self):
        self.assertIn(
            "A small solar/battery-powered computer in a home does AI work for someone who needs it.",
            self.html,
        )
        self.assertIn("<h4>Rooftop solar/battery</h4>", self.html)

    def test_sunstack_descriptions_use_solar_battery(self):
        for phrase in (
            "rooftop-solar/battery surplus",
            "solar/battery-powered GPUs",
            "spare solar/battery energy",
            "spare rooftop solar/battery energy",
            "Solar/battery-aware scheduling",
        ):
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, self.html + self.readme)

    def test_solar_only_facts_remain_accurate(self):
        for phrase in (
            "paid for the solar you export at midday",
            "Most solar homes % on Earth",
            "has rooftop solar",
            "solar roof behind",
        ):
            with self.subTest(phrase=phrase):
                self.assertIn(phrase, self.html)

    def test_value_flow_prompt_requires_a_home_battery(self):
        self.assertIn("compact wall-mounted home battery", self.generator)
        self.assertIn("beside the house", self.generator)


if __name__ == "__main__":
    unittest.main()
