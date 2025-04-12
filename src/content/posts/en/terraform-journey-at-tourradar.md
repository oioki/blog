---
title: "Terraform journey at TourRadar"
id: "en/terraform-journey-at-tourradar"
publishDate: "10 Nov 2020"
description: ""
---

![](/assets/blog/terraform-journey-at-tourradar/mars.webp)

With the rapid development of cloud platforms in recent years, the world needed something to tame its power and unlock the full potential. _Infrastructure as Code_, which followed up, became a game-changing concept. It’s not a secret that the IaC approach provides many advantages:

- **version control:** the infrastructure definition is treated literally as code, thus giving similar benefits, such as full history recorded, usual PR review processes, rollbacks, etc.;
- **fast development cycles:** reusable code, less manual work, more automation possibilities;
- **robust infrastructure:** reduce human error, reduce differences between environments, possibilities to ensure security practices.

This is the story about how we adopted this useful practice at TourRadar, and managed to achieve 100% Terraform coverage for all existing and new projects in AWS.


## Stage 0: Pre-Terraform era

When I joined TourRadar, it was a time of huge growth in terms of both the team and the infrastructure. With the rapid growth came the [microservices approach](https://medium.com/tourradar/unleash-the-microservices-7c8347bfb321). At this point, there were a couple of dozens of them already. In the pre-Terraform era, all changes to AWS resources were made by manual clicking through the AWS web console or, at best, by some semi-automatic bash scripts utilizing aws-cli underneath. Having this was not considered a viable and scalable option in the long run. Infrastructure as Code was urgently needed.

Since we had no IaC expertise in the company, we started researching which tools could be used. Ultimately, we had to choose between Hashicorp Terraform and AWS CloudFormation. We tried both and we chose Terraform for its cloud-agnostic universality and cleaner code syntax. At TourRadar, we build almost everything on AWS, so AWS CloudFormation seemed to be a natural choice. However, later we understood that Terraform was the right choice. We used it to describe Cloudflare DNS entries, StatusCake alarms, SQL entities (databases and users in MySQL and PostgreSQL), etc.

I will skip the basics of Terraform, its syntax, etc. This knowledge is available in the pretty good [official Terraform tutorial](https://learn.hashicorp.com/collections/terraform/aws-get-started).


## Stage 1. Baby steps

In the beginning, it seemed like an enormous task, an elephant that was almost impossible to eat at once. However, we understood that doing it properly would have been highly beneficial. So we started small and decided to describe a tiny service consisting of EC2 and related security groups. Thanks to the Terraform [import feature](https://www.terraform.io/docs/import/index.html), it was quite easy. The general approach for importing was:

1. Decide which resource exactly do you want to import (EC2 instance in our case).
2. Create a minimal Terraform configuration describing this resource:

```tf
resource "aws_instance" "example" {
  # Ubuntu 18.04 LTS
  ami = "ami-0d2505740b82f7948"
  instance_type = "t2.micro"
  key_name      = "oioki"
}
```

3. Do `terraform import aws_instance.example <your_ec2_instance_id>`

4. Run `terraform plan` and observe the difference.

5. Add any missing fields in your Terraform configuration from step 2.

6. Repeat steps 4 and 5 until `terraform plan` shows no difference.

We saw this approach works, so we decided to go full forward and do the rest of the work.


## Stage 2. Scaling import

Among our microservices, a large share of them were ECS services (basically, Docker managed by AWS). When we did the routine work of importing a few ECS services, we noticed almost all of them required a similar set of AWS resources: ECS task definition, ECS service itself, CloudWatch log group, load balancer rule, etc. But there were small differences here and there.

Here came the idea of the Terraform template for ECS services. The template created was just a bunch of `*.tf` files describing these common AWS resources for each ECS-based microservice. To make use of them, one just copies the template, adapts it to their own project, and then we proceed to terraform import. We were aware of [native Terraform modules](https://www.terraform.io/docs/configuration/modules.html) which allows the code to be reused. However, we wanted the microservices to be less dependent on each other. It might sound controversial, but copy & paste was good in our case. Another level of modular abstraction did not bring many profits. In the end, this approach worked well.

After creating this template, we proceeded to the tedious but important work of importing all existing microservices. Needless to say, this import process alone revealed a lot of security and operational issues with our infrastructure:

- Some services were available to public internet yet without a specific need;
- Few secrets hardcoded in ECS task definitions;
- Too wide permissions in IAM policies;
- Differences between staging and production environments, which could potentially lead to bugs;
- No AWS resource naming conventions.

Based on this, we planned and executed more projects, which improved the infrastructure health and security in the next few months.

We did a similar template for AWS Lambda based applications. Also, we started to collect a list of our own Terraform best practices.


## Stage 3. New services

While we were importing all existing vast infrastructure, the company definitely needed to move forward and create new microservices for specific needs. These things happened in parallel.

I have to admit: using Terraform requires more initial effort, but it definitely pays off. One might be reluctant to write Terraform files just for the sake of proof of concept. It is natural and understandable. As a result, we came up with a combined approach.

At TourRadar, we have a separate Sandbox AWS account, where any developer can do almost anything, try out new AWS products, test potential solutions, and so on. So, the process for new services looked like:

- The developer plays in the sandbox, creates all needed resources there (with Terraform or manually via UI), deploys their application, and tests the actual code;
- Once done, Systems Engineers either adopt a Terraform description written by a developer or do the good old import procedure. Here we ensure our best practices regarding naming, security, tagging, etc.
- After that, we deploy the new service to Staging, then to Production.

This might not sound much DevOps-y as you can clearly see the “throw over the wall” anti-pattern here. However, read on.


## Stage 4. DevOps mindset

After some time, we had all Terraform files in one monolithic infrastructure repository. On one hand, it was convenient: one can change Terraform descriptions of different projects in one shot, within one pull request. However, this approach created an unwanted silo of “terraform guys with their repository”. One natural step to overcome this was to move Terraform configurations to each project repository. This way the infrastructure becomes more visible and is more “owned” by someone who takes care of a specific project.

Here comes another important topic: education and knowledge sharing. It is not a magic wand, but hard teamwork. We conducted a couple of talks and did many sit-down sessions with developers to spread the Terraform knowledge.

Throughout time, more people became aware of what Terraform is and started to create pull requests. It was no longer considered a “black magic” available only to the Systems Engineering team. This is pretty much where we are now, and the journey continues.

As for the future steps, we are thinking about implementing some automatic steps for Terraform, like linting, validating, automatic deployments. However, as always, it takes time.

## Afterwords

Throughout this adventure, we gained useful experience, understood how to use Terraform more efficiently, and established some best practices suitable for our company.
