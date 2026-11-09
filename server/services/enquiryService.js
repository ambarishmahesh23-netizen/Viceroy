
import Enquiry from "../models/Enquiry.js";

const createEnquiry = async (enquiryData) => {
  const enquiry = await Enquiry.create(enquiryData);

  return enquiry;
};

export default { createEnquiry };
