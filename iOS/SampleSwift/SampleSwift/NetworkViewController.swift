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

import UIKit

class NetworkViewController: UIViewController {

  @IBAction func tappedGetAPI(_ sender: UIButton) {
    let getURL = URL(string: "https://demo9512366.mockable.io/FlipperGet")!
    let dataTask = URLSession.shared.dataTask(with: getURL){ [weak self] (data, response, error) in
      guard let strongSelf = self else { return }
      guard let dataUnwrapped = data else {
        strongSelf.showAlert(message: "Received no data in GET API")
        return
      }

      if let errorUnwrapped = error {
        strongSelf.showAlert(message: "Received error in GET API Error:\(errorUnwrapped.localizedDescription)")
        return
      }

      let dict = try! JSONSerialization.jsonObject(with: dataUnwrapped, options: JSONSerialization.ReadingOptions.init(rawValue: 0)) as! [String: String]
      // As sonar cannot detect print() in Logs
      NSLog("MSG-GET: \(dict["msg"] ?? "Did not find msg key in the received response")")
      strongSelf.showAlert(message: "Received response from GET API, please check the sonar network plugin for detailed response")
    }
    dataTask.resume()
  }

  @IBAction func tappedPOSTAPI(_ sender: UIButton) {
    guard let postURL = URL(string: "https://demo9512366.mockable.io/FlipperPost") else {
      showAlert(message: "Check the POST URL")
      return
    }
    var postRequest = URLRequest(url: postURL)
    postRequest.addValue("application/json", forHTTPHeaderField: "Content-Type")
    postRequest.addValue("application/json", forHTTPHeaderField: "Accept")

    let dict = ["app" : "Flipper", "remarks": "Its Awesome"]
    postRequest.httpBody = try! JSONSerialization.data(withJSONObject: dict, options: JSONSerialization.WritingOptions.init(rawValue: 0))
    postRequest.httpMethod = "POST"
    let dataTask = URLSession.shared.dataTask(with: postRequest){ [weak self] (data, response, error) in
      guard let strongSelf = self else { return }
      guard let dataUnwrapped = data else {
        strongSelf.showAlert(message: "Received no data in POST API")
        return
      }

      if let errorUnwrapped = error {
        strongSelf.showAlert(message: "Received error in POST API Error:\(errorUnwrapped.localizedDescription)")
        return
      }

      let dict = try! JSONSerialization.jsonObject(with: dataUnwrapped, options: JSONSerialization.ReadingOptions.init(rawValue: 0)) as! [String: String]
      // As sonar cannot detect print() in Logs
      NSLog("MSG-POST: \(dict["msg"] ?? "Did not find msg key in the received response")")
      strongSelf.showAlert(message: "Received response from POST API, please check the sonar network plugin for detailed response")
    }
    dataTask.resume()
  }

  @IBAction func tappedFetchFBLitho(_ sender: UIButton) {
    let imageURL = URL(string: "https://raw.githubusercontent.com/facebook/litho/master/docs/static/logo.png")!
    let dataTask = URLSession.shared.dataTask(with: imageURL){ [weak self] (data, response, error) in
      guard let strongSelf = self else { return }
      guard let _ = data else {
        strongSelf.showAlert(message: "Received no data in Images API")
        return
      }

      if let errorUnwrapped = error {
        strongSelf.showAlert(message: "Received error in Images API Error:\(errorUnwrapped.localizedDescription)")
        return
      }

      // As sonar cannot detect print() in Logs
      NSLog("Got Image")
      strongSelf.showAlert(message: "Received Litho Image")
    }
    dataTask.resume()
  }

  func showAlert(message: String) {
    let alertController = UIAlertController.init(title: "Flipper", message: message, preferredStyle: .alert);
    let alertAction = UIAlertAction(title: "Okay", style: UIAlertActionStyle.default, handler: nil)
    alertController.addAction(alertAction)
    present(alertController, animated: true, completion: nil)
  }
}
