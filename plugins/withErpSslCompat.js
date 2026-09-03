const { withMainApplication, createRunOncePlugin } = require('@expo/config-plugins');

const MARKER = 'OkHttpClientProvider.setOkHttpClientFactory';

const IMPORTS = `import com.facebook.react.modules.network.OkHttpClientFactory
import com.facebook.react.modules.network.OkHttpClientProvider
import com.facebook.react.modules.network.ReactCookieJarContainer
import okhttp3.OkHttpClient
import java.security.cert.X509Certificate
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager`;

const SETUP = `
    // Internal ERP servers often use HTTPS with certs issued for hostnames, not LAN IPs.
    OkHttpClientProvider.setOkHttpClientFactory(object : OkHttpClientFactory {
      override fun createNewNetworkModuleClient(): OkHttpClient {
        val trustAllCerts = arrayOf<TrustManager>(
          object : X509TrustManager {
            override fun checkClientTrusted(chain: Array<X509Certificate>, authType: String) {}
            override fun checkServerTrusted(chain: Array<X509Certificate>, authType: String) {}
            override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
          }
        )
        val sslContext = SSLContext.getInstance("TLS")
        sslContext.init(null, trustAllCerts, java.security.SecureRandom())
        return OkHttpClient.Builder()
          .connectTimeout(0, TimeUnit.MILLISECONDS)
          .readTimeout(0, TimeUnit.MILLISECONDS)
          .writeTimeout(0, TimeUnit.MILLISECONDS)
          .cookieJar(ReactCookieJarContainer())
          .sslSocketFactory(sslContext.socketFactory, trustAllCerts[0] as X509TrustManager)
          .hostnameVerifier { _, _ -> true }
          .build()
      }
    })
`;

function withErpSslCompat(config) {
  return withMainApplication(config, (modConfig) => {
    let contents = modConfig.modResults.contents;
    if (contents.includes(MARKER)) {
      return modConfig;
    }

    if (!contents.includes('class MainApplication')) {
      throw new Error('withErpSslCompat: MainApplication class not found');
    }

    const importAnchor = 'import expo.modules.ExpoReactHostFactory';
    if (!contents.includes(importAnchor)) {
      throw new Error('withErpSslCompat: unexpected MainApplication format');
    }

    contents = contents.replace(importAnchor, `${importAnchor}\n${IMPORTS}`);

    const onCreateAnchor = 'super.onCreate()';
    if (!contents.includes(onCreateAnchor)) {
      throw new Error('withErpSslCompat: onCreate() anchor not found');
    }

    contents = contents.replace(onCreateAnchor, `${onCreateAnchor}${SETUP}`);

    modConfig.modResults.contents = contents;
    return modConfig;
  });
}

module.exports = createRunOncePlugin(withErpSslCompat, 'withErpSslCompat');
