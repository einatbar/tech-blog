---
title: 'Keep calm and race on: a redux-saga case study'
date: '2018-11-11'
tags: ['JavaScript', 'React', 'Redux', 'Redux-Saga']
---

In this article, I will present a case study using Redux-Saga, JavaScript Generators, and Redux by building a polling feature for a web application. A poll API request is one that makes an AJAX call to the server on a set time interval to check for updates. We will then test our code using Cypress.

## Build a Polling Feature with Redux Saga

Imagine you need to make polled request to the server to receive the status of a job that was triggered by the client. For example, let’s imagine a scenario where the user uploads a file. Then, after the upload has completed successfully, the server needs to process the file before it can be viewed within the app. In this instance, you would like to display a status bar indicating the progress and block the user from viewing the file until it has completed.

The server will have 3 responses to our poll request: started, succeeded, or failed. The following code shows how to write a poll request using Redux Saga.

```javascript
import { take, put, delay } from 'redux-saga/effects'
function* checkJobStatus() {
  let jobSucceeded = false
  while (!jobSucceeded) {
    yield put({ type: 'POLLING_ACTION_REQUEST' })
    const pollingAction = yield take('POLLING_ACTION_RESPONSE')
    const pollingStatus = pollingAction.payload.response.status
    switch (pollingStatus) {
      case POLLING_STATUS.SUCCEEDED:
        jobSucceeded = true
        yield put({ type: 'HANDLE_POLLING_SUCCESS' })
        break
      case POLLING_STATUS.FAILED:
        jobSucceeded = true
        yield put({ type: 'HANDLE_POLLING_FAILURE' })
        break
      default:
        break
    }
    // delay the next polling request in 1 second
    yield call(delay, 1000)
  }
}
```

In the above example, we are executing a request by using the ‘put’ effect, which dispatches an action. Immediately afterward we use a Redux-Saga effect called ‘take’, which blocks the execution of the Saga until someone dispatches the action given as a parameter. Once POLLING_ACTION_RESPONSE is dispatched, we check the status returned from the server. If we get either a ‘complete’ or ‘failed’ status we need to handle them accordingly, using the ‘put’ effect. Otherwise, we execute another polling request to the server and so on until it has completed.

> An Effect is simply an object that contains some information to be interpreted by the middleware. You can view Effects like instructions to the middleware to perform some operation (e.g., invoke some asynchronous function, dispatch an action to the store, etc.).

But what if you want to handle more than just acting according to the server’s response to the polling request? What if you want to limit the time of the polling to the server, let’s say 1 minute? What if you also want to let the user cancel the upload of the file in the middle of the processing? Well that sounds a bit more complex, doesn’t it?

With redux-saga it’s way easier than you may think!

Before we look at some code, let’s break it down a bit and understand what we are facing here. First, we have the polling request that starts running asynchronously. Now, at any point in time while this request is running, the user can cancel this action.

Let’s also not forget that this request can fail for many reasons (server errors, bad request, etc). Another element here is the timeout we want to set for this request. All of these scenarios can happen at any given time while the request is running, and we are interested to know which one executes first, therefore we are facing a race of actions.

Let’s see how its done with redux-saga:

The following example runs a race Redux-Saga function between four effects:

1. A call to our original checkJobStatus function.
2. A CANCEL_POLLING action which may be eventually dispatched on the store.
3. A POLLING_FAILED action which may be eventually dispatched on the store.
4. A call to delay. delay is a Redux-Saga utility function that returns a Promise that resolves after X milliseconds. We use it to set a timeout for the race.

```javascript
import { race, take, put, call, delay } from 'redux-saga/effects'
function* startPollingSaga(action) {
  // Race the following commands with a timeout of 1 minute
  const { response, failed, timeout } = yield race({
    response: call(checkJobStatus),
    cancel: take('CANCEL_POLLING'),
    failed: take('POLLING_FAILED'),
    timeout: call(delay, 60000)
  })
  // handle failure scenario
  if (failed) {
    yield put({ type: 'HANDLE_POLLING_FAILURE' })
  }
}
```

If call(checkJobStatus) ends first, cancel, failed and timeout will be undefined. In our case response will also be undefined since checkJobStatus does not return a Promise, but handles the polling response by it self.

If call(delay, 60000) resolves first, timeout will be the result of delay and cancel, failed and response will be undefined.

If an action of type CANCEL_POLLING is dispatched on the Store before checkJobStatus completes, response, failed and timeout will be undefined and cancel will get the value of the dispatched action.

If an action of type POLLING_FAILED is dispatched on the store before checkJobStatus completes, response, cancel and timeout will be undefined and failed will get the value of the dispatched action.

Note: In the case POLLING_FAILED or CANCEL_POLLING actions are dispatched, the race Effect will automatically cancel checkJobStatus and delay by throwing a cancellation error inside it.

## Testing Redux Saga with Cypress

Now that we can implement the above scenario, let's learn how we can easily test it as well!

In this example, I will demonstrate a solution using Cypress.

> Note: I have decided to show an example of testing the scenario where a timeout occurred because it’s probably the most interesting one to talk about. All other scenarios are pretty straight forward.

```javascript
describe('ui test', function() {
  it('should wait for processing to timeout', function() {
    // Overrides native global functions related to time allowing
    // them to be controlled synchronously before polling request
    cy.clock()
    cy.route('GET', 'upload file endpoint', uploadResponse).as('fileUploaded')
    cy.route('GET', 'polling endpoint', pollingResponse).as('pollingStarted')
    // Since this article is talking about file upload we are using
    // a custom command to imitate the file upload because it's not
    // built-in in cypress.
    cy.uploadFile('dropdown zone', 'file name')

    cy.wait('fileUploaded')
    cy.wait('pollingStarted')
    // Set the clock forward to cause a timeout
    cy.clock().then(clock => {
      clock.tick(60000)
      clock.restore()
    })
    // Here you can verify that the desired ui behavior is as
    // expected
  })
})
```

So what do we have here?

Before defining the routes and execute the polling request, we want to override the native global functions related to time. This will allow us to control the native global functions synchronously. For this purpose, we use cy.clock(); In this way we can decide later on to set the clock forward so we can cause a timeout.

After defining the upload and polling request routes, we submit a file and wait for it to upload and for the polling to start.

Now we can set the clock forward:

```javascript
cy.clock().then(clock => {
  clock.tick(60000)
  clock.restore()
})
```

`clock.tick(milliseconds)`

> Move the clock a specified number of milliseconds. Any timers within the affected range of time will be called.

`clock.restore()`

> Restore all overridden native functions. This is automatically called between tests, so should not generally be needed.

After that, you are good to go and verify that the desired UI behavior is as expected.

So what have we learned so far? We learned that when using Redux-Saga, it is very easy to manage a race between multiple actions. Personally, I like the fact that you can manage all these actions in once place, which makes it very intuitive and easy to maintain. We also learned that when using Cypress it’s super easy to test a scenario where one of your actions results in a timeout. We saw how to “wait” for the timeout, which is asynchronous, in a synchronous manner.

That’s it! Now it is your turn to give it a try!
