/*
 * This file provided by Facebook is for non-commercial testing and evaluation
 * purposes only.  Facebook reserves all rights not expressly granted.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * FACEBOOK BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

#import "NetworkViewController.h"

@interface NetworkViewController ()

@end

@implementation NetworkViewController

- (void)viewDidLoad {
  [super viewDidLoad];
  self.navigationItem.title = @"Network";
}

- (IBAction)tappedGithubLitho:(UIButton *)sender {
  [[[NSURLSession sharedSession] dataTaskWithURL:[NSURL URLWithString:@"https://raw.githubusercontent.com/facebook/litho/master/docs/static/logo.png"] completionHandler:^(NSData *_Nullable data, NSURLResponse *_Nullable response, NSError *_Nullable error) {
    if (error && !data) {
      return;
    }
    NSLog(@"Got Image");
  }] resume];
}

- (IBAction)tappedPOSTAPI:(UIButton *)sender {
  NSString *post = @"https://demo9512366.mockable.io/FlipperPost";
  NSURL *url = [NSURL URLWithString:post];
  NSMutableURLRequest *urlRequest = [NSMutableURLRequest requestWithURL: url];
  [urlRequest addValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
  [urlRequest addValue:@"application/json" forHTTPHeaderField:@"Accept"];
  NSDictionary *mapData = [[NSDictionary alloc] initWithObjectsAndKeys: @"Flipper", @"app",
                           @"Its awesome", @"remarks",
                           nil];
  NSError *error = nil;
  NSData *postData = [NSJSONSerialization dataWithJSONObject:mapData options:0 error:&error];
  [urlRequest setHTTPBody:postData];
  [urlRequest setHTTPMethod:@"POST"];
  __weak NetworkViewController *weakSelf = self;
  [[[NSURLSession sharedSession] dataTaskWithRequest:urlRequest completionHandler:^(NSData *_Nullable data, NSURLResponse *_Nullable response, NSError *_Nullable dataTaskError) {

    if (dataTaskError || !data) {
      UIAlertController *alertController = [weakSelf alertControllerForMessage:@"Received error in POST API response"];
      [weakSelf presentViewController:alertController animated:true completion:nil];
      return;
    }
    NSDictionary *dict = [NSJSONSerialization JSONObjectWithData:data options:0 error:&dataTaskError];
    NSLog(@"MSG-POST: %@", dict[@"msg"]);

    UIAlertController *alertController = [weakSelf alertControllerForMessage:@"Received response from POST API"];
    [weakSelf presentViewController:alertController animated:true completion:nil];

  }] resume];
}

- (IBAction)tappedGetAPI:(UIButton *)sender {
  __weak NetworkViewController *weakSelf = self;
  [[[NSURLSession sharedSession] dataTaskWithURL:[NSURL URLWithString:@"https://demo9512366.mockable.io/FlipperGet"] completionHandler:^(NSData *_Nullable data, NSURLResponse *_Nullable response, NSError *_Nullable error) {
    if (error || !data) {
      UIAlertController *alertController = [weakSelf alertControllerForMessage:@"Received error in GET API response"];
      [weakSelf presentViewController:alertController animated:true completion:nil];
      return;
    }
    NSDictionary *dict = [NSJSONSerialization JSONObjectWithData:data options:0 error:&error];
    NSLog(@"MSG-GET: %@", dict[@"msg"]);
    UIAlertController *alertController = [weakSelf alertControllerForMessage:@"Received response from GET API"];
    [weakSelf presentViewController:alertController animated:true completion:nil];
  }] resume];
}


- (UIAlertController *)alertControllerForMessage:(nonnull NSString *)msg {
  UIAlertController *controller = [UIAlertController alertControllerWithTitle:@"Flipper" message:msg preferredStyle:UIAlertControllerStyleAlert];
  UIAlertAction *action = [UIAlertAction actionWithTitle:@"Ok" style:UIAlertActionStyleDefault handler:nil];
  [controller addAction:action];
  return controller;
}

@end
