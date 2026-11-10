package atlas;

import io.karatelabs.core.Runner;
import io.karatelabs.core.SuiteResult;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AtlasTest {
    @Test
    void atlasApi() {
        SuiteResult result = Runner.path("classpath:atlas")
            .outputHtmlReport(true)
            .outputJunitXml(true)
            .parallel(1);
        assertTrue(result.getScenarioCount() > 0, "No Atlas scenarios found");
        assertTrue(result.isPassed(), result.toString());
    }
}
