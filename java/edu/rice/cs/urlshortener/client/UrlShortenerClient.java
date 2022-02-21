package edu.rice.cs.urlshortener.client;

import com.google.common.util.concurrent.ThreadFactoryBuilder;
import edu.rice.comp539.urlshortener.proto.ShortenRequest;
import edu.rice.comp539.urlshortener.proto.ShortenResponse;
import edu.rice.comp539.urlshortener.proto.ShortenUrlGrpc;
import edu.rice.comp539.urlshortener.proto.UrlData;
import edu.rice.comp539.urlshortener.proto.User;
import edu.rice.comp539.urlshortener.proto.UserName;
import io.grpc.Channel;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.stub.ClientCallStreamObserver;
import io.grpc.stub.StreamObserver;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.logging.Logger;

public class UrlShortenerClient {
  private static final Logger logger = Logger.getLogger(UrlShortenerClient.class.getName());

  private final ShortenUrlGrpc.ShortenUrlStub stub;

  /**
   * Construct an async client for accessing ShortenUrl server using an existing channel.
   */
  public UrlShortenerClient(Channel channel) {
    stub = ShortenUrlGrpc.newStub(channel);
  }

  private static final AtomicLong REQUEST_ENUMERATOR = new AtomicLong();

  private final void run() {
    Instant startTime = Instant.now();
    final StreamObserver<ShortenResponse> streamObserver = new StreamObserver<>() {
      private final long requestId = REQUEST_ENUMERATOR.getAndIncrement();

      @Override
      public void onNext(ShortenResponse response) {
        System.out.println("Response #" + requestId + ": [" + response + ']');
      }

      @Override
      public void onError(Throwable throwable) {
        String message = throwable.getMessage();
        String errorMessage = "Exception for request #" + requestId + ": [" + message + ']';
        for (StackTraceElement ste : throwable.getStackTrace()) {
          errorMessage += "\n" + ste;
        }
        System.out.println(errorMessage);
      }

      @Override
      public void onCompleted() {
        System.out.println("onCompleted()");
        System.out.println("Timing: " + Duration.between(startTime, Instant.now()).toMillis());
        LATCH.countDown();
      }
    };

    stub.shorten(ShortenRequest.newBuilder().setUrlData(
                UrlData.newBuilder()
                    .setTimestampMillisFromEpoch(System.currentTimeMillis())
                    .setLongUrl("http://some.long.url")
                    .setUser(User.newBuilder()
                        .setUserName(
                            UserName.newBuilder()
                                .setFirstName("John")
                                .setLastName("User").build())
                        .setUserLogin("fake-login")
                        .setUserId(123456L)
                        .setUserAgeInMillisFromEpoch(
                            Instant.now().minus(Duration.ofDays(365 * 30L)).toEpochMilli()))
                    .build())
            .build(),
        streamObserver);
    System.out.println("Timing: " + Duration.between(startTime, Instant.now()).toMillis());
  }

  private static final CountDownLatch LATCH = new CountDownLatch(1);

  /**
   * The args may contain port (e.g., 3333) as the first arg and host as the second.
   */
  public static void main(String[] args) throws Exception {
    String host = "localhost";
    int port = 3333;
    switch (args.length) {
      case 0:
        break;
      case 2:
        host = args[1];
      case 1:
        port = Integer.parseInt(args[0]);
        break;
      default:
        throw new IllegalStateException();
    }

    ManagedChannel mc = ManagedChannelBuilder
        .forAddress(host, port)
        .executor(Executors.newFixedThreadPool(
            4,
            new ThreadFactoryBuilder()
                .setDaemon(true)
                .setNameFormat("client-runner-%d")
                .build()))
        .usePlaintext()
        .build();
    try {
      new UrlShortenerClient(mc).run();
    } catch (Exception e) {
    } finally {
      LATCH.await();
      mc.shutdownNow().awaitTermination(5, TimeUnit.SECONDS);
    }
  }
}
